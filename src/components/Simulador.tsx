'use client';

import { useState, useRef, useEffect } from 'react';
import { BANCO_CASOS, CasoBanco, CasoSimulador } from '@/lib/banco-simulador';

// ============================================================
// SIMULADOR DE RACIOCÍNIO CLÍNICO — ONE Health & Performance
// Prática deliberada com IA: o profissional externaliza o
// raciocínio ANTES de receber qualquer resposta.
// ============================================================

interface Dominio {
  id: string;
  nome: string;
  desc: string;
}

interface Dificuldade {
  id: string;
  nome: string;
  desc: string;
}

// Mesmo formato tanto para caso gerado pela IA quanto para caso do banco
// (real, adaptado): os prompts de anamnese/exame/mentor não distinguem a origem.
type Caso = CasoSimulador;

interface Entrada {
  pergunta: string;
  justificativa: string;
  resposta: string;
  comentario: string | null;
}

interface Dimensao {
  nome: string;
  nota: number;
  comentario: string;
}

interface DebriefData {
  sintese: string;
  vieses: string[];
  perguntas_perdidas: string[];
  calibracao: string;
  dimensoes: Dimensao[];
  proximo_caso: string;
}

const DOMINIOS: Dominio[] = [
  {
    id: 'rtp',
    nome: 'Return-to-Play',
    desc: 'Decisões de retorno ao esporte: critérios, carga, risco de recidiva.',
  },
  {
    id: 'lombar',
    nome: 'Dor lombar',
    desc: 'Triagem, red flags, classificação e raciocínio de conduta.',
  },
  {
    id: 'interdependencia',
    nome: 'Interdependência regional',
    desc: 'Quando o gerador do sintoma não está onde o paciente aponta.',
  },
];

const DIFICULDADES: Dificuldade[] = [
  { id: 'iniciante', nome: 'Iniciante', desc: 'Apresentação típica, poucos dados conflitantes.' },
  { id: 'intermediario', nome: 'Intermediário', desc: 'Ambiguidade real, mais de um caminho plausível.' },
  { id: 'avancado', nome: 'Avançado', desc: 'Achado atípico, dado conflitante ou red flag discreta.' },
];

const ESTAGIOS = [
  { n: '01', nome: 'Hipóteses iniciais', chave: 'hipoteses' },
  { n: '02', nome: 'Anamnese', chave: 'anamnese' },
  { n: '03', nome: 'Exame & testes', chave: 'exame' },
  { n: '04', nome: 'Conduta', chave: 'conduta' },
  { n: '05', nome: 'Debrief', chave: 'debrief' },
];

// ---------- utilidades de API ----------

// A chamada vai para a rota do NOSSO servidor (/api/claude), que guarda a
// chave da Anthropic — o navegador nunca vê a chave.
async function callClaude(
  messages: { role: 'user'; content: string }[],
  maxTokens = 1000
): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, max_tokens: maxTokens }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error ?? 'API retornou ' + response.status);
  }
  return data.text as string;
}

function parseJSON<T>(text: string): T {
  const clean = text.replace(/```json|```/g, '').trim();
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start)
    throw new Error('resposta da IA veio sem JSON completo (possível corte por limite de tokens)');
  try {
    return JSON.parse(clean.slice(start, end + 1)) as T;
  } catch {
    throw new Error('JSON malformado na resposta da IA');
  }
}

// ---------- prompts ----------

function promptGerarCaso(dominio: Dominio, dificuldade: Dificuldade) {
  return `Você gera casos clínicos para treino de raciocínio de fisioterapeutas brasileiros.
Crie UM caso do domínio "${dominio.nome}" (${dominio.desc}), dificuldade "${dificuldade.nome}" (${dificuldade.desc}).
Contexto brasileiro realista. A vinheta inicial deve ser INCOMPLETA de propósito: informação boa só aparece se o profissional perguntar.
Responda APENAS com JSON válido, sem markdown, sem texto antes ou depois, neste formato exato:
{"titulo":"...","paciente":{"nome":"...","idade":0,"perfil":"..."},"vinheta":"3 a 4 frases, apresentação inicial incompleta",
"dados_ocultos":{"anamnese":[{"tema":"...","info":"..."}],"exame_fisico":[{"teste":"...","achado":"..."}],"complementares":[{"exame":"...","resultado":"..."}]},
"gabarito":{"diagnostico_provavel":"...","diferenciais":["...","..."],"red_flags":"...","perguntas_de_ouro":["...","...","..."],"pegadinha":"..."}}
Regras rígidas de tamanho (o JSON completo precisa caber em ~800 tokens): exatamente 5 itens em anamnese, 4 em exame_fisico, 0 a 1 em complementares. Cada campo de texto com no máximo 15 palavras, exceto a vinheta. Não use aspas duplas dentro dos textos. Não use quebras de linha dentro dos valores.`;
}

function promptAvaliarHipoteses(caso: Caso, resposta: string, confianca: number) {
  return `Você é um mentor clínico experiente (fisioterapia esportiva/osteopatia), direto e específico. Avalia PROCESSO de raciocínio, nunca entrega diagnóstico.
CASO (visão do mentor): ${JSON.stringify(caso.gabarito)}
VINHETA vista pelo aluno: ${caso.vinheta}
HIPÓTESES E JUSTIFICATIVAS DO ALUNO (confiança declarada ${confianca}/10): ${resposta}
Responda APENAS JSON: {"feedback":"2 a 4 frases: o que funcionou no raciocínio, o que faltou, sem revelar o diagnóstico","alerta_vies":"nome + 1 frase se detectar viés (ancoragem, fechamento prematuro, disponibilidade), senão null"}`;
}

function promptAnamnese(caso: Caso, pergunta: string, justificativa: string) {
  return `Você simula os dados de um caso clínico e comenta a qualidade das perguntas como um mentor.
DADOS OCULTOS DO CASO: ${JSON.stringify(caso.dados_ocultos.anamnese)}
PACIENTE: ${JSON.stringify(caso.paciente)} | VINHETA: ${caso.vinheta}
PERGUNTA DO ALUNO: ${pergunta}
JUSTIFICATIVA DELE (o que a resposta mudaria no raciocínio): ${justificativa}
Regras: responda com a informação dos dados ocultos que corresponde à pergunta. Se não houver correspondência, improvise algo breve e coerente com o caso, sem inventar achado decisivo novo. NUNCA revele o diagnóstico.
Responda APENAS JSON: {"resposta":"o que o paciente/dado revela, 1 a 3 frases, voz de prontuário","comentario":"1 frase de mentor sobre a qualidade da pergunta E da justificativa, ou null se não houver nada útil a dizer"}`;
}

function promptExame(caso: Caso, pergunta: string, justificativa: string) {
  return `Você simula resultados de exame físico/testes de um caso clínico e comenta como mentor.
ACHADOS OCULTOS: ${JSON.stringify(caso.dados_ocultos.exame_fisico)} | COMPLEMENTARES: ${JSON.stringify(caso.dados_ocultos.complementares || [])}
TESTE/EXAME SOLICITADO: ${pergunta}
O QUE O ALUNO ESPERA QUE CADA RESULTADO SIGNIFIQUE: ${justificativa}
Regras: entregue o achado correspondente dos dados ocultos; se o teste pedido não existir neles, dê um resultado plausível e neutro. NUNCA revele o diagnóstico.
Responda APENAS JSON: {"resposta":"achado objetivo, voz de prontuário, 1 a 2 frases","comentario":"1 frase de mentor sobre a escolha do teste e a interpretação antecipada, ou null"}`;
}

function promptAvaliarConduta(caso: Caso, transcript: string, resposta: string, confianca: number) {
  return `Você é um mentor clínico experiente. Avalie a hipótese final e o plano do aluno. Seja direto, específico, sem elogio genérico.
GABARITO: ${JSON.stringify(caso.gabarito)}
TRAJETO DO ALUNO ATÉ AQUI (resumo): ${transcript}
HIPÓTESE FINAL + PLANO (confiança ${confianca}/10): ${resposta}
Agora você PODE discutir o diagnóstico provável, comparando com o raciocínio dele.
Responda APENAS JSON: {"feedback":"3 a 5 frases: acurácia do raciocínio, qualidade do plano, linguagem (aponte linguagem nocebo se houver)","visao_expert":"2 a 3 frases: o que um clínico experiente teria notado ou feito diferente"}`;
}

function promptDebrief(caso: Caso, transcript: string, conf1: number, conf2: number) {
  return `Você é um mentor clínico experiente fazendo o debrief final de um caso simulado. Avalie o PROCESSO, não só o acerto.
GABARITO: ${JSON.stringify(caso.gabarito)}
TRAJETO COMPLETO DO ALUNO: ${transcript}
CONFIANÇA DECLARADA: hipóteses iniciais ${conf1}/10, conduta final ${conf2}/10.
Responda APENAS JSON:
{"sintese":"2 a 3 frases sobre o desempenho global",
"vieses":["até 3 vieses observados com evidência do transcript, ou lista vazia"],
"perguntas_perdidas":["perguntas de ouro que ele NÃO fez, das listadas no gabarito"],
"calibracao":"1 a 2 frases comparando a confiança declarada com o desempenho real",
"dimensoes":[{"nome":"Geração de hipóteses","nota":0,"comentario":"1 frase"},{"nome":"Coleta de dados","nota":0,"comentario":"1 frase"},{"nome":"Integração e conduta","nota":0,"comentario":"1 frase"},{"nome":"Metacognição","nota":0,"comentario":"1 frase"}],
"proximo_caso":"1 frase: que tipo de caso ele deveria treinar em seguida e por quê"}
Notas de 0 a 10. Seja honesto: nota alta só com mérito real.`;
}

// ---------- componente principal ----------

export default function SimuladorRaciocinio() {
  const [tela, setTela] = useState<'setup' | 'caso'>('setup');
  const [dominio, setDominio] = useState<Dominio | null>(null);
  const [dificuldade, setDificuldade] = useState<Dificuldade>(DIFICULDADES[1]);
  const [caso, setCaso] = useState<Caso | null>(null);
  const [estagio, setEstagio] = useState(0);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // estado por estágio
  const [hipoteses, setHipoteses] = useState({
    texto: '',
    confianca: 6,
    feedback: null as string | null,
    vies: null as string | null,
    enviado: false,
  });
  const [anamnese, setAnamnese] = useState({
    pergunta: '',
    justificativa: '',
    entradas: [] as Entrada[],
  });
  const [exame, setExame] = useState({
    pergunta: '',
    justificativa: '',
    entradas: [] as Entrada[],
  });
  const [conduta, setConduta] = useState({
    texto: '',
    confianca: 6,
    feedback: null as string | null,
    expert: null as string | null,
    enviado: false,
  });
  const [debrief, setDebrief] = useState<DebriefData | null>(null);

  const fimRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (fimRef.current) fimRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  function resumoTranscript() {
    const a = anamnese.entradas
      .map((e) => `PERGUNTOU: ${e.pergunta} (justif: ${e.justificativa}) → ${e.resposta}`)
      .join(' | ');
    const x = exame.entradas.map((e) => `TESTOU: ${e.pergunta} → ${e.resposta}`).join(' | ');
    return `HIPÓTESES INICIAIS: ${hipoteses.texto} || ANAMNESE: ${a || 'nenhuma pergunta'} || EXAME: ${x || 'nenhum teste'} || CONDUTA: ${conduta.texto}`.slice(0, 4000);
  }

  function resetarEstagios() {
    setEstagio(0);
    setHipoteses({ texto: '', confianca: 6, feedback: null, vies: null, enviado: false });
    setAnamnese({ pergunta: '', justificativa: '', entradas: [] });
    setExame({ pergunta: '', justificativa: '', entradas: [] });
    setConduta({ texto: '', confianca: 6, feedback: null, expert: null, enviado: false });
    setDebrief(null);
  }

  // Caso do banco: começa na hora, sem chamada de geração — a IA entra
  // apenas para interpretar os dados ocultos e comentar como mentor.
  function iniciarCasoBanco(c: CasoBanco) {
    setErro(null);
    setCaso(c);
    resetarEstagios();
    setTela('caso');
  }

  async function gerarCaso() {
    if (!dominio) return;
    setLoading(true);
    setErro(null);
    let ultimoErro: Error | null = null;
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const raw = await callClaude([
          { role: 'user', content: promptGerarCaso(dominio, dificuldade) },
        ]);
        const c = parseJSON<Caso>(raw);
        if (!c.vinheta || !c.dados_ocultos || !c.gabarito) throw new Error('Caso incompleto');
        setCaso(c);
        setEstagio(0);
        setHipoteses({ texto: '', confianca: 6, feedback: null, vies: null, enviado: false });
        setAnamnese({ pergunta: '', justificativa: '', entradas: [] });
        setExame({ pergunta: '', justificativa: '', entradas: [] });
        setConduta({ texto: '', confianca: 6, feedback: null, expert: null, enviado: false });
        setDebrief(null);
        setTela('caso');
        setLoading(false);
        return;
      } catch (e) {
        ultimoErro = e instanceof Error ? e : new Error('desconhecido');
      }
    }
    setErro(
      'Não consegui gerar o caso após 2 tentativas. Detalhe técnico: ' +
        (ultimoErro?.message ?? 'desconhecido')
    );
    setLoading(false);
  }

  async function enviarHipoteses() {
    if (!caso || hipoteses.texto.trim().length < 20) return;
    setLoading(true);
    setErro(null);
    try {
      const raw = await callClaude([
        { role: 'user', content: promptAvaliarHipoteses(caso, hipoteses.texto, hipoteses.confianca) },
      ]);
      const r = parseJSON<{ feedback: string; alerta_vies: string | null }>(raw);
      setHipoteses((h) => ({ ...h, feedback: r.feedback, vies: r.alerta_vies, enviado: true }));
    } catch {
      setErro('Falha ao avaliar. Tente enviar de novo.');
    } finally {
      setLoading(false);
    }
  }

  async function perguntarAnamnese() {
    if (!caso || !anamnese.pergunta.trim() || !anamnese.justificativa.trim()) return;
    setLoading(true);
    setErro(null);
    const p = anamnese.pergunta;
    const j = anamnese.justificativa;
    try {
      const raw = await callClaude([{ role: 'user', content: promptAnamnese(caso, p, j) }]);
      const r = parseJSON<{ resposta: string; comentario: string | null }>(raw);
      setAnamnese((a) => ({
        pergunta: '',
        justificativa: '',
        entradas: [
          ...a.entradas,
          { pergunta: p, justificativa: j, resposta: r.resposta, comentario: r.comentario },
        ],
      }));
    } catch {
      setErro('Falha na anamnese. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  async function pedirTeste() {
    if (!caso || !exame.pergunta.trim() || !exame.justificativa.trim()) return;
    setLoading(true);
    setErro(null);
    const p = exame.pergunta;
    const j = exame.justificativa;
    try {
      const raw = await callClaude([{ role: 'user', content: promptExame(caso, p, j) }]);
      const r = parseJSON<{ resposta: string; comentario: string | null }>(raw);
      setExame((x) => ({
        pergunta: '',
        justificativa: '',
        entradas: [
          ...x.entradas,
          { pergunta: p, justificativa: j, resposta: r.resposta, comentario: r.comentario },
        ],
      }));
    } catch {
      setErro('Falha ao executar o teste. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  async function enviarConduta() {
    if (!caso || conduta.texto.trim().length < 20) return;
    setLoading(true);
    setErro(null);
    try {
      const raw = await callClaude([
        {
          role: 'user',
          content: promptAvaliarConduta(caso, resumoTranscript(), conduta.texto, conduta.confianca),
        },
      ]);
      const r = parseJSON<{ feedback: string; visao_expert: string | null }>(raw);
      setConduta((c) => ({ ...c, feedback: r.feedback, expert: r.visao_expert, enviado: true }));
    } catch {
      setErro('Falha ao avaliar a conduta. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  async function gerarDebrief() {
    if (!caso) return;
    setLoading(true);
    setErro(null);
    try {
      const raw = await callClaude(
        [
          {
            role: 'user',
            content: promptDebrief(caso, resumoTranscript(), hipoteses.confianca, conduta.confianca),
          },
        ],
        1000
      );
      const r = parseJSON<DebriefData>(raw);
      setDebrief(r);
      setEstagio(4);
    } catch {
      setErro('Falha ao gerar o debrief. Tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  const achados = [
    ...anamnese.entradas.map((e) => ({ tipo: 'ANAMNESE', texto: e.resposta })),
    ...exame.entradas.map((e) => ({ tipo: 'EXAME', texto: e.resposta })),
  ];

  return (
    <div className="sim-root">
      <style>{CSS}</style>

      {tela === 'setup' && (
        <div className="setup">
          <div className="marca">ONE HEALTH &amp; PERFORMANCE</div>
          <h1 className="titulo-display">Simulador de raciocínio clínico</h1>
          <p className="lede">
            Você recebe um caso incompleto de propósito. Informação boa só aparece se a sua
            pergunta for boa — e toda pergunta exige justificativa. O feedback avalia o seu
            processo, não só a resposta final.
          </p>

          <div className="rotulo">Casos do banco — reais, adaptados</div>
          <div className="grade-dominios">
            {BANCO_CASOS.map((c) => (
              <button key={c.id} className="card-dominio" onClick={() => iniciarCasoBanco(c)}>
                <span className="card-nome">{c.titulo}</span>
                <span className="card-desc">
                  {c.area} ·{' '}
                  {c.dificuldade === 'iniciante'
                    ? 'Iniciante'
                    : c.dificuldade === 'intermediario'
                      ? 'Intermediário'
                      : 'Avançado'}
                </span>
                <span className="card-fonte">{c.fonte}</span>
              </button>
            ))}
          </div>

          <div className="rotulo">Ou gere um caso novo com IA — domínio</div>
          <div className="grade-dominios">
            {DOMINIOS.map((d) => (
              <button
                key={d.id}
                className={'card-dominio' + (dominio && dominio.id === d.id ? ' ativo' : '')}
                onClick={() => setDominio(d)}
              >
                <span className="card-nome">{d.nome}</span>
                <span className="card-desc">{d.desc}</span>
              </button>
            ))}
          </div>

          <div className="rotulo">Dificuldade</div>
          <div className="grade-dif">
            {DIFICULDADES.map((d) => (
              <button
                key={d.id}
                className={'pill' + (dificuldade.id === d.id ? ' ativo' : '')}
                onClick={() => setDificuldade(d)}
              >
                {d.nome}
              </button>
            ))}
          </div>
          <p className="dif-desc">{dificuldade.desc}</p>

          {erro && <div className="erro">{erro}</div>}

          <button className="botao-primario" disabled={!dominio || loading} onClick={gerarCaso}>
            {loading ? 'Montando o caso…' : 'Gerar caso'}
          </button>
        </div>
      )}

      {tela === 'caso' && caso && (
        <div className="layout">
          {/* trilho de protocolo */}
          <aside className="trilho">
            <div className="marca pequena">ONE</div>
            {ESTAGIOS.map((e, i) => (
              <div
                key={e.chave}
                className={'passo' + (i === estagio ? ' atual' : i < estagio ? ' feito' : '')}
              >
                <span className="passo-n">{e.n}</span>
                <span className="passo-nome">{e.nome}</span>
              </div>
            ))}
            <button
              className="botao-fantasma"
              onClick={() => {
                setTela('setup');
                setCaso(null);
              }}
            >
              Novo caso
            </button>
          </aside>

          {/* coluna principal */}
          <main className="principal">
            <div className="caso-cabecalho">
              <h2 className="titulo-caso">{caso.titulo}</h2>
              <p className="paciente">
                {caso.paciente.nome}, {caso.paciente.idade} anos — {caso.paciente.perfil}
              </p>
              <p className="vinheta">{caso.vinheta}</p>
            </div>

            {achados.length > 0 && (
              <div className="prontuario">
                <div className="prontuario-titulo">Prontuário — achados obtidos</div>
                {achados.map((a, i) => (
                  <div key={i} className="prontuario-linha">
                    <span className="prontuario-tag">{a.tipo}</span>
                    <span>{a.texto}</span>
                  </div>
                ))}
              </div>
            )}

            {erro && <div className="erro">{erro}</div>}

            {/* Estágio 1 — hipóteses */}
            {estagio === 0 && (
              <section className="estagio">
                <h3 className="estagio-titulo">
                  Com só o que está acima: quais são suas 3 principais hipóteses, e por quê?
                </h3>
                <textarea
                  className="area"
                  rows={6}
                  placeholder={'1. … porque …\n2. … porque …\n3. … porque …'}
                  value={hipoteses.texto}
                  disabled={hipoteses.enviado}
                  onChange={(ev) => setHipoteses({ ...hipoteses, texto: ev.target.value })}
                />
                {!hipoteses.enviado && (
                  <div className="linha-confianca">
                    <label>Confiança nas hipóteses: {hipoteses.confianca}/10</label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={hipoteses.confianca}
                      onChange={(ev) =>
                        setHipoteses({ ...hipoteses, confianca: Number(ev.target.value) })
                      }
                    />
                  </div>
                )}
                {!hipoteses.enviado && (
                  <button
                    className="botao-primario"
                    disabled={loading || hipoteses.texto.trim().length < 20}
                    onClick={enviarHipoteses}
                  >
                    {loading ? 'O mentor está lendo…' : 'Enviar raciocínio'}
                  </button>
                )}
                {hipoteses.feedback && (
                  <div className="feedback">
                    <div className="feedback-rotulo">Mentor</div>
                    <p>{hipoteses.feedback}</p>
                    {hipoteses.vies && <p className="vies">⚠ Viés no radar: {hipoteses.vies}</p>}
                    <button className="botao-primario" onClick={() => setEstagio(1)}>
                      Ir para a anamnese
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Estágio 2 — anamnese */}
            {estagio === 1 && (
              <section className="estagio">
                <h3 className="estagio-titulo">Anamnese: pergunte, mas justifique cada pergunta.</h3>
                <p className="dica">
                  O que a resposta mudaria no seu raciocínio? Se você não sabe responder isso, a
                  pergunta talvez não valha o tempo do paciente.
                </p>
                {anamnese.entradas.map((e, i) => (
                  <div key={i} className="troca">
                    <p className="troca-pergunta">Você: {e.pergunta}</p>
                    <p className="troca-resposta">{e.resposta}</p>
                    {e.comentario && <p className="troca-comentario">Mentor: {e.comentario}</p>}
                  </div>
                ))}
                <input
                  className="campo"
                  placeholder="Sua pergunta ao paciente"
                  value={anamnese.pergunta}
                  onChange={(ev) => setAnamnese({ ...anamnese, pergunta: ev.target.value })}
                />
                <input
                  className="campo"
                  placeholder="Por quê? O que cada resposta possível mudaria na sua hipótese?"
                  value={anamnese.justificativa}
                  onChange={(ev) => setAnamnese({ ...anamnese, justificativa: ev.target.value })}
                />
                <div className="linha-botoes">
                  <button className="botao-primario" disabled={loading} onClick={perguntarAnamnese}>
                    {loading ? '…' : 'Perguntar'}
                  </button>
                  <button
                    className="botao-secundario"
                    disabled={loading || anamnese.entradas.length === 0}
                    onClick={() => setEstagio(2)}
                  >
                    Encerrar anamnese →
                  </button>
                </div>
              </section>
            )}

            {/* Estágio 3 — exame */}
            {estagio === 2 && (
              <section className="estagio">
                <h3 className="estagio-titulo">
                  Exame físico e testes: o que você faria, e o que cada resultado significaria?
                </h3>
                {exame.entradas.map((e, i) => (
                  <div key={i} className="troca">
                    <p className="troca-pergunta">Teste: {e.pergunta}</p>
                    <p className="troca-resposta">{e.resposta}</p>
                    {e.comentario && <p className="troca-comentario">Mentor: {e.comentario}</p>}
                  </div>
                ))}
                <input
                  className="campo"
                  placeholder="Teste ou exame que você quer realizar"
                  value={exame.pergunta}
                  onChange={(ev) => setExame({ ...exame, pergunta: ev.target.value })}
                />
                <input
                  className="campo"
                  placeholder="O que um resultado positivo/negativo mudaria no seu raciocínio?"
                  value={exame.justificativa}
                  onChange={(ev) => setExame({ ...exame, justificativa: ev.target.value })}
                />
                <div className="linha-botoes">
                  <button className="botao-primario" disabled={loading} onClick={pedirTeste}>
                    {loading ? '…' : 'Executar teste'}
                  </button>
                  <button
                    className="botao-secundario"
                    disabled={loading || exame.entradas.length === 0}
                    onClick={() => setEstagio(3)}
                  >
                    Fechar exame →
                  </button>
                </div>
              </section>
            )}

            {/* Estágio 4 — conduta */}
            {estagio === 3 && (
              <section className="estagio">
                <h3 className="estagio-titulo">Hipótese final e plano inicial de conduta.</h3>
                <textarea
                  className="area"
                  rows={6}
                  placeholder="Hipótese mais provável, diferenciais que ainda não descartei, e as primeiras decisões de conduta — incluindo como eu explicaria isso ao paciente."
                  value={conduta.texto}
                  disabled={conduta.enviado}
                  onChange={(ev) => setConduta({ ...conduta, texto: ev.target.value })}
                />
                {!conduta.enviado && (
                  <div className="linha-confianca">
                    <label>Confiança na conduta: {conduta.confianca}/10</label>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={conduta.confianca}
                      onChange={(ev) =>
                        setConduta({ ...conduta, confianca: Number(ev.target.value) })
                      }
                    />
                  </div>
                )}
                {!conduta.enviado && (
                  <button
                    className="botao-primario"
                    disabled={loading || conduta.texto.trim().length < 20}
                    onClick={enviarConduta}
                  >
                    {loading ? 'O mentor está avaliando…' : 'Enviar conduta'}
                  </button>
                )}
                {conduta.feedback && (
                  <div className="feedback">
                    <div className="feedback-rotulo">Mentor</div>
                    <p>{conduta.feedback}</p>
                    {conduta.expert && (
                      <p className="expert">
                        <strong>Visão do experiente:</strong> {conduta.expert}
                      </p>
                    )}
                    <button className="botao-primario" disabled={loading} onClick={gerarDebrief}>
                      {loading ? 'Preparando o debrief…' : 'Gerar debrief do caso'}
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Estágio 5 — debrief */}
            {estagio === 4 && debrief && (
              <section className="estagio">
                <h3 className="estagio-titulo">Debrief — avaliação do processo</h3>
                <p className="sintese">{debrief.sintese}</p>

                <div className="dimensoes">
                  {(debrief.dimensoes || []).map((d, i) => (
                    <div key={i} className="dim">
                      <div className="dim-topo">
                        <span>{d.nome}</span>
                        <span className="dim-nota">{d.nota}/10</span>
                      </div>
                      <div className="dim-barra">
                        <div className="dim-preenchido" style={{ width: (d.nota / 10) * 100 + '%' }} />
                      </div>
                      <p className="dim-comentario">{d.comentario}</p>
                    </div>
                  ))}
                </div>

                {debrief.vieses && debrief.vieses.length > 0 && (
                  <div className="bloco-debrief">
                    <div className="bloco-titulo">Vieses observados</div>
                    <ul>
                      {debrief.vieses.map((v, i) => (
                        <li key={i}>{v}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {debrief.perguntas_perdidas && debrief.perguntas_perdidas.length > 0 && (
                  <div className="bloco-debrief">
                    <div className="bloco-titulo">Perguntas de ouro que ficaram na mesa</div>
                    <ul>
                      {debrief.perguntas_perdidas.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bloco-debrief">
                  <div className="bloco-titulo">Calibração</div>
                  <p>{debrief.calibracao}</p>
                </div>

                <div className="bloco-debrief proximo">
                  <div className="bloco-titulo">Próximo caso sugerido</div>
                  <p>{debrief.proximo_caso}</p>
                </div>

                <button
                  className="botao-primario"
                  onClick={() => {
                    setTela('setup');
                    setCaso(null);
                  }}
                >
                  Treinar outro caso
                </button>
              </section>
            )}

            <div ref={fimRef} />
          </main>
        </div>
      )}
    </div>
  );
}

// ---------- estilo ----------

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,600;1,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.sim-root{
  --bg:#EFF2F1; --card:#FFFFFF; --ink:#12292B; --muted:#5C6F70;
  --petrol:#135E63; --petrol-ink:#0A3437; --papel:#F7F3EA;
  --alerta:#A8442D; --ok:#2E7D5B; --linha:#D8DFDE;
  background:var(--bg); color:var(--ink); min-height:100vh;
  font-family:'IBM Plex Sans',sans-serif; font-size:15px; line-height:1.55;
}
.sim-root *{box-sizing:border-box;}
.marca{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.18em; color:var(--petrol);}
.marca.pequena{margin-bottom:20px;}
.titulo-display{font-family:'IBM Plex Serif',serif; font-weight:600; font-size:clamp(28px,4vw,40px); margin:10px 0 12px; color:var(--petrol-ink);}
.lede{max-width:560px; color:var(--muted); margin:0 0 28px;}
.setup{max-width:720px; margin:0 auto; padding:48px 24px 64px;}
.rotulo{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin:24px 0 10px;}
.grade-dominios{display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px;}
.card-dominio{background:var(--card); border:1px solid var(--linha); border-radius:8px; padding:14px 16px; text-align:left; cursor:pointer; display:flex; flex-direction:column; gap:4px; transition:border-color .15s; font-family:inherit; font-size:inherit; color:inherit;}
.card-dominio:hover{border-color:var(--petrol);}
.card-dominio.ativo{border-color:var(--petrol); box-shadow:inset 0 0 0 1px var(--petrol);}
.card-nome{font-weight:600; color:var(--petrol-ink);}
.card-desc{font-size:13px; color:var(--muted);}
.card-fonte{font-size:11px; color:#8A7B54; font-style:italic; margin-top:2px;}
.grade-dif{display:flex; gap:8px; flex-wrap:wrap;}
.pill{background:var(--card); border:1px solid var(--linha); border-radius:999px; padding:7px 16px; cursor:pointer; font-family:inherit; font-size:14px;}
.pill.ativo{background:var(--petrol); color:#fff; border-color:var(--petrol);}
.dif-desc{font-size:13px; color:var(--muted); margin-top:8px;}
.botao-primario{background:var(--petrol); color:#fff; border:none; border-radius:6px; padding:11px 22px; font-family:inherit; font-size:15px; font-weight:500; cursor:pointer; margin-top:18px;}
.botao-primario:disabled{opacity:.45; cursor:default;}
.botao-primario:focus-visible,.botao-secundario:focus-visible,.pill:focus-visible,.card-dominio:focus-visible{outline:2px solid var(--petrol-ink); outline-offset:2px;}
.botao-secundario{background:transparent; border:1px solid var(--petrol); color:var(--petrol); border-radius:6px; padding:10px 18px; font-family:inherit; cursor:pointer; margin-top:18px;}
.botao-secundario:disabled{opacity:.4; cursor:default;}
.botao-fantasma{margin-top:auto; background:none; border:none; color:var(--muted); font-family:'IBM Plex Mono',monospace; font-size:12px; cursor:pointer; text-align:left; padding:8px 0;}
.erro{background:#FBEDE8; border:1px solid var(--alerta); color:var(--alerta); border-radius:6px; padding:10px 14px; margin-top:14px; font-size:14px;}

.layout{display:flex; min-height:100vh;}
.trilho{width:190px; flex-shrink:0; padding:28px 20px; border-right:1px solid var(--linha); display:flex; flex-direction:column; gap:4px; position:sticky; top:0; height:100vh;}
.passo{display:flex; gap:10px; align-items:baseline; padding:9px 4px; color:var(--muted); border-left:2px solid transparent;}
.passo-n{font-family:'IBM Plex Mono',monospace; font-size:12px;}
.passo-nome{font-size:13px;}
.passo.atual{color:var(--petrol-ink); border-left-color:var(--petrol); font-weight:600; padding-left:8px;}
.passo.feito{color:var(--ok);}
.principal{flex:1; max-width:760px; padding:32px 28px 80px;}
.caso-cabecalho{margin-bottom:18px;}
.titulo-caso{font-family:'IBM Plex Serif',serif; font-style:italic; font-weight:500; font-size:26px; margin:0 0 4px; color:var(--petrol-ink);}
.paciente{font-size:13px; color:var(--muted); margin:0 0 12px; font-family:'IBM Plex Mono',monospace;}
.vinheta{background:var(--card); border:1px solid var(--linha); border-radius:8px; padding:16px 18px; margin:0;}

.prontuario{background:var(--papel); border:1px solid #E4DCC8; border-radius:8px; padding:14px 16px; margin:16px 0;}
.prontuario-titulo{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#8A7B54; margin-bottom:10px;}
.prontuario-linha{font-family:'IBM Plex Mono',monospace; font-size:13px; display:flex; gap:10px; padding:5px 0; border-top:1px dashed #E4DCC8;}
.prontuario-tag{color:var(--petrol); flex-shrink:0; font-size:11px; padding-top:2px;}

.estagio{margin-top:26px;}
.estagio-titulo{font-family:'IBM Plex Serif',serif; font-weight:600; font-size:19px; margin:0 0 10px; color:var(--petrol-ink);}
.dica{font-size:13px; color:var(--muted); margin:0 0 14px;}
.area,.campo{width:100%; background:var(--card); border:1px solid var(--linha); border-radius:6px; padding:12px 14px; font-family:inherit; font-size:15px; color:var(--ink); margin-bottom:10px;}
.area:focus,.campo:focus{outline:2px solid var(--petrol); outline-offset:0; border-color:var(--petrol);}
.linha-confianca{display:flex; flex-direction:column; gap:6px; margin:6px 0 4px; font-size:13px; color:var(--muted);}
.linha-confianca input{accent-color:var(--petrol); max-width:320px;}
.linha-botoes{display:flex; gap:12px; align-items:center;}

.feedback{background:var(--card); border-left:3px solid var(--petrol); border-radius:0 8px 8px 0; padding:16px 18px; margin-top:18px;}
.feedback-rotulo{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--petrol); margin-bottom:6px;}
.feedback p{margin:0 0 10px;}
.vies{color:var(--alerta); font-weight:500;}
.expert{color:var(--petrol-ink);}

.troca{margin-bottom:14px;}
.troca-pergunta{margin:0; font-weight:500;}
.troca-resposta{margin:4px 0 0; font-family:'IBM Plex Mono',monospace; font-size:13px; background:var(--papel); border:1px solid #E4DCC8; border-radius:6px; padding:8px 12px;}
.troca-comentario{margin:4px 0 0; font-size:13px; color:var(--petrol); font-style:italic;}

.sintese{font-size:16px;}
.dimensoes{display:grid; gap:14px; margin:18px 0;}
.dim{background:var(--card); border:1px solid var(--linha); border-radius:8px; padding:12px 16px;}
.dim-topo{display:flex; justify-content:space-between; font-weight:600; font-size:14px;}
.dim-nota{font-family:'IBM Plex Mono',monospace; color:var(--petrol);}
.dim-barra{height:6px; background:var(--bg); border-radius:3px; margin:8px 0;}
.dim-preenchido{height:100%; background:var(--petrol); border-radius:3px; transition:width .5s ease;}
.dim-comentario{margin:0; font-size:13px; color:var(--muted);}
.bloco-debrief{background:var(--card); border:1px solid var(--linha); border-radius:8px; padding:14px 16px; margin-bottom:12px;}
.bloco-debrief.proximo{border-color:var(--petrol);}
.bloco-titulo{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;}
.bloco-debrief ul{margin:0; padding-left:18px;}
.bloco-debrief li{margin-bottom:4px;}
.bloco-debrief p{margin:0;}

@media (max-width:680px){
  .layout{flex-direction:column;}
  .trilho{width:100%; height:auto; position:static; flex-direction:row; flex-wrap:wrap; border-right:none; border-bottom:1px solid var(--linha); padding:14px 16px; gap:2px;}
  .passo{padding:5px 8px;}
  .passo-nome{display:none;}
  .passo.atual .passo-nome{display:inline;}
  .botao-fantasma{margin:0 0 0 auto;}
  .principal{padding:20px 16px 60px;}
}
@media (prefers-reduced-motion:reduce){
  .dim-preenchido{transition:none;}
}
`;
