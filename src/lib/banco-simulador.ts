// Banco de casos do simulador: casos REAIS (adaptados e anonimizados) que a
// IA interpreta como paciente e mentor. Diferente do caso gerado na hora,
// aqui os dados ocultos e o gabarito vêm de caso resolvido com desfecho
// verificado — a IA responde com naturalidade, mas não inventa nada decisivo.
//
// Regra editorial: casos de literatura são REESCRITOS (fatos clínicos, nunca
// o texto do autor); casos próprios são anonimizados (LGPD).

export interface CasoSimulador {
  titulo: string;
  paciente: { nome: string; idade: number; perfil: string };
  vinheta: string;
  dados_ocultos: {
    anamnese: { tema: string; info: string }[];
    exame_fisico: { teste: string; achado: string }[];
    complementares?: { exame: string; resultado: string }[];
  };
  gabarito: {
    diagnostico_provavel: string;
    diferenciais: string[];
    red_flags: string;
    perguntas_de_ouro: string[];
    pegadinha: string;
  };
}

export interface CasoBanco extends CasoSimulador {
  id: string;
  area: string;
  dificuldade: 'iniciante' | 'intermediario' | 'avancado';
  fonte: string;
}

export const BANCO_CASOS: CasoBanco[] = [
  {
    id: 'impressao-basilar',
    area: 'Quadril · Neurológico',
    dificuldade: 'avancado',
    fonte: 'Adaptado de caso da literatura de diagnóstico diferencial (Goodman & Snyder)',
    titulo: 'O declínio que não era do quadril',
    paciente: {
      nome: 'Cecília',
      idade: 67,
      perfil: 'aposentada, artrite reumatoide há 13 anos (metotrexato)',
    },
    vinheta:
      'Cecília, 67 anos, tem artrite reumatoide há 13 anos. Há cerca de 6 meses, após uma queda com fratura de acetábulo, passou por artroplastia total de quadril direito. Você conduziu a reabilitação: em 10 semanas ela largou o andador, depois a bengala, e entrou num programa de natação. Recebeu alta com exercícios domiciliares. Agora o marido liga: nas últimas semanas a marcha dela vem piorando aos poucos, e ela voltou a usar bengala. Ela chega ao consultório para reavaliação.',
    dados_ocultos: {
      anamnese: [
        {
          tema: 'Sintomas novos além da marcha (urinário)',
          info: 'Refere urgência urinária com episódios de incontinência, de início recente. Não tinha isso antes.',
        },
        {
          tema: 'Cognição e memória',
          info: 'O marido conta que ela passou a esquecer datas de aniversário dos filhos e a trocar os nomes dos netos — algo novo.',
        },
        {
          tema: 'Padrão do declínio (trauma? gradual?)',
          info: 'Piora gradual e progressiva ao longo de semanas, sem nova queda, sem trauma e sem episódio agudo.',
        },
        {
          tema: 'Dor',
          info: 'Sem dor nova no quadril operado; ela mesma não atribui a piora a dor — "as pernas é que não obedecem".',
        },
        {
          tema: 'Pescoço e a AR',
          info: 'AR de longa data com queixas cervicais altas intermitentes ao longo dos anos; nega trauma cervical recente.',
        },
      ],
      exame_fisico: [
        {
          teste: 'Marcha e transferências',
          achado:
            'Base alargada, passos curtos, instabilidade de tronco; dá passos à frente e cambaleia para trás. Não levanta da cadeira sem ajuda e despenca para trás ao sentar.',
        },
        {
          teste: 'Exame neurológico dos MMII',
          achado:
            'Tônus aumentado nos membros inferiores; propriocepção e reflexos profundos diminuídos nos pés, direita pior que esquerda. Sensibilidade tátil e dolorosa normais.',
        },
        {
          teste: 'Exame do quadril operado',
          achado:
            'Compatível com artroplastia há 6 meses: fraqueza leve de flexores e discreta perda de amplitude. Nada que explique o quadro atual.',
        },
        {
          teste: 'Coordenação e MMSS',
          achado:
            'Roda denteada leve ao teste de dismetria; tremor com os braços estendidos à frente. Romberg ausente. Sinais vitais normais.',
        },
      ],
      complementares: [
        {
          exame: 'Ressonância magnética (após encaminhamento médico)',
          resultado:
            'Impressão basilar: o processo odontoide de C2 invaginando o forame magno.',
        },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Impressão basilar por instabilidade atlantoaxial da artrite reumatoide — a inflamação crônica enfraquece os ligamentos do odontoide. Caso de encaminhamento, não de tratamento.',
      diferenciais: [
        'Descondicionamento / fraqueza residual pós-artroplastia',
        'Mielopatia cervical de outra causa',
        'Hidrocefalia de pressão normal (tríade parecida: marcha + incontinência + cognição)',
      ],
      red_flags:
        'Marcha atáxica progressiva + incontinência de urgência nova + declínio cognitivo + sinais de neurônio motor superior, em paciente com AR de longa data.',
      perguntas_de_ouro: [
        'Surgiu algum sintoma novo além da marcha — urinário, cognitivo?',
        'A piora foi gradual ou houve nova queda/trauma?',
        'Como está o pescoço? A AR de 13 anos envolve a coluna cervical alta?',
      ],
      pegadinha:
        'Dois motivos "óbvios" para o declínio (pós-operatório de quadril + AR) ancoram o raciocínio no musculoesquelético — enquanto o quadro grita causa neurológica central.',
    },
  },
];
