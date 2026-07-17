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

  // ==========================================================
  // Casos autorais — quadros mais comuns da fisioterapia NMSE.
  // Apresentações típicas, contexto brasileiro. Escritos do zero
  // (não reproduzem texto de nenhuma fonte).
  // ==========================================================

  {
    id: 'lombalgia-mecanica',
    area: 'Lombar',
    dificuldade: 'iniciante',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'A lombar que travou carregando caixa',
    paciente: { nome: 'Rogério', idade: 34, perfil: 'analista de logística, sedentário na semana' },
    vinheta:
      'Rogério, 34 anos, tem dor lombar há 4 dias, que começou quando levantou uma caixa pesada no trabalho torcendo o tronco. A dor é do lado direito da lombar, "fisgada", e piora quando ele fica muito tempo sentado. Está preocupado porque nunca tinha sentido isso.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Irradiação para a perna', info: 'A dor fica na lombar e no máximo na nádega alta; não desce abaixo do joelho, sem formigamento nem dormência.' },
        { tema: 'O que alivia e o que piora', info: 'Melhora ao caminhar e mudar de posição; piora ao ficar sentado e ao levantar da cadeira. Alívio quase completo deitado.' },
        { tema: 'Sono, febre, peso, história', info: 'Dorme bem (a dor não o acorda), sem febre, sem perda de peso, sem doenças prévias relevantes. Primeiro episódio.' },
        { tema: 'Bexiga e intestino', info: 'Controle urinário e intestinal normais; sem dormência na região da sela.' },
        { tema: 'Trabalho e rotina', info: 'Passa 8h sentado; não pratica atividade física; achou que fosse "coluna gasta".' },
      ],
      exame_fisico: [
        { teste: 'Movimentos ativos da lombar', achado: 'Flexão limitada por dor e leve desvio antálgico; extensão alivia parcialmente. Sem dor irradiada aos movimentos.' },
        { teste: 'Teste de elevação da perna estendida (Lasègue/SLR)', achado: 'Negativo bilateralmente — não reproduz dor na perna.' },
        { teste: 'Exame neurológico dos MMII', achado: 'Força, reflexos e sensibilidade preservados. Nenhum sinal de déficit.' },
        { teste: 'Palpação e provocação', achado: 'Dor à palpação da musculatura paravertebral direita, sem dor à percussão dos processos espinhosos.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Lombalgia mecânica inespecífica aguda (provável origem muscular/articular), sem sinais de radiculopatia nem bandeiras vermelhas. Bom prognóstico — manter ativo, educar, evitar repouso.',
      diferenciais: ['Radiculopatia lombar (afastada: sem irradiação abaixo do joelho, SLR negativo)', 'Fratura por estresse (afastada: sem trauma de alta energia, sem dor à percussão)'],
      red_flags: 'Nenhuma presente — este caso treina o oposto: reconhecer quando NÃO há bandeira vermelha e evitar encaminhamento e exame de imagem desnecessários.',
      perguntas_de_ouro: ['A dor irradia abaixo do joelho? Há formigamento/dormência?', 'Há alteração de controle de bexiga/intestino ou dormência na sela?', 'Como estão sono, peso, febre e história prévia?'],
      pegadinha: 'A ansiedade do paciente ("nunca senti isso", "coluna gasta") pode empurrar o clínico a pedir imagem e tratar demais um quadro autolimitado.',
    },
  },

  {
    id: 'cervicalgia-postural',
    area: 'Cervical',
    dificuldade: 'iniciante',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'O pescoço do home office',
    paciente: { nome: 'Larissa', idade: 29, perfil: 'designer, trabalha em notebook sobre a mesa da cozinha' },
    vinheta:
      'Larissa, 29 anos, tem dor no pescoço e na parte alta das costas há 3 meses, que piora ao fim do dia de trabalho. Descreve como "peso" e "tensão". Começou depois que passou a trabalhar de casa, num notebook apoiado na mesa da cozinha.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Irradiação para o braço', info: 'A dor fica no pescoço e trapézio; não desce pelo braço, sem formigamento nas mãos.' },
        { tema: 'Cefaleia', info: 'Tem dor de cabeça no fim do dia, que parte da nuca e sobe — some quando o pescoço relaxa. Sem náusea nem fotofobia.' },
        { tema: 'Padrão diário e postos de trabalho', info: 'Sem dor ao acordar; piora acumulando ao longo do dia. Notebook baixo, sem monitor externo, sem apoio.' },
        { tema: 'Tontura, sono, sinais sistêmicos', info: 'Sem tontura, sem alteração de sono, sem febre nem perda de peso. Estresse alto com prazos.' },
        { tema: 'Trauma', info: 'Nega trauma, acidente ou "torcicolo" agudo.' },
      ],
      exame_fisico: [
        { teste: 'Amplitude cervical ativa', achado: 'Leve limitação e desconforto ao fim da rotação e extensão; sem dor irradiada.' },
        { teste: 'Exame neurológico dos MMSS', achado: 'Força, reflexos e sensibilidade normais nos membros superiores.' },
        { teste: 'Palpação da musculatura cervicotorácica', achado: 'Tensão e pontos dolorosos em trapézio superior e levantador da escápula, bilaterais.' },
        { teste: 'Teste de Spurling', achado: 'Negativo — não reproduz dor irradiada ao braço.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Cervicalgia mecânica de origem postural/ocupacional, com cefaleia tensional/cervicogênica associada. Manejo: ergonomia, exercício, educação — sem imagem.',
      diferenciais: ['Radiculopatia cervical (afastada: Spurling negativo, sem déficit)', 'Enxaqueca (menos provável: cefaleia parte da nuca, sem náusea/fotofobia)'],
      red_flags: 'Ausentes. Caso treina reconhecer dor mecânica benigna relacionada a carga postural e resistir ao overtreatment.',
      perguntas_de_ouro: ['A dor irradia pelo braço? Há formigamento nas mãos?', 'A cefaleia tem náusea/fotofobia ou parte do pescoço?', 'Como é o posto de trabalho e o padrão da dor ao longo do dia?'],
      pegadinha: 'O rótulo "retificação da cervical" que ela ouviu de um colega pode ancorar o raciocínio num achado de imagem irrelevante.',
    },
  },

  {
    id: 'manguito-rotador',
    area: 'Ombro',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'A dor de pintar o teto',
    paciente: { nome: 'Antônio', idade: 52, perfil: 'pintor autônomo, destro' },
    vinheta:
      'Antônio, 52 anos, pintor, tem dor no ombro direito há 8 semanas, de início gradual, que piora ao trabalhar com o braço acima da cabeça. Sente uma "pontada" na lateral do ombro e às vezes dor à noite ao deitar sobre ele.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Localização e irradiação', info: 'Dor na face lateral do ombro, podendo descer até o meio do braço; não passa do cotovelo, sem formigamento.' },
        { tema: 'Dor noturna e o que piora', info: 'Acorda ao rolar sobre o ombro; piora com elevação acima da cabeça e ao vestir camisa. Melhora com o braço apoiado.' },
        { tema: 'Rigidez matinal e evolução', info: 'Sem rigidez matinal prolongada; movimento passivo é possível, só doloroso. Aumentou a carga de trabalho no último mês.' },
        { tema: 'Cervical', info: 'Sem dor no pescoço, sem irradiação cervical; virar o pescoço não muda a dor do ombro.' },
        { tema: 'Sinais sistêmicos e trauma', info: 'Sem febre, sem perda de peso, sem trauma agudo. Diabetes? Não.' },
      ],
      exame_fisico: [
        { teste: 'Arco doloroso na abdução ativa', achado: 'Dor entre 60° e 120° de abdução ativa; alívio acima disso.' },
        { teste: 'Amplitude passiva vs ativa', achado: 'Amplitude passiva praticamente completa e indolor no fim; a restrição é por dor no movimento ativo, não por bloqueio.' },
        { teste: 'Testes resistidos do manguito (Jobe/rotação externa)', achado: 'Dor e leve fraqueza à abdução e rotação externa resistidas, força globalmente preservada.' },
        { teste: 'Exame cervical de triagem', achado: 'Spurling negativo; amplitude cervical livre e indolor.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Tendinopatia/síndrome do impacto do manguito rotador por sobrecarga ocupacional. Amplitude passiva preservada afasta capsulite; exame cervical normal afasta origem cervical.',
      diferenciais: ['Capsulite adesiva (afastada: passiva preservada)', 'Dor cervical irradiada (afastada: Spurling negativo)', 'Rotura completa do manguito (menos provável: força globalmente preservada)'],
      red_flags: 'Ausentes; atenção seria para massa, febre ou trauma de alta energia — nenhum presente.',
      perguntas_de_ouro: ['A amplitude PASSIVA está preservada ou há bloqueio (capsulite)?', 'A dor vem do pescoço? Virar o pescoço muda a dor?', 'Como evoluiu a carga de trabalho e há dor noturna?'],
      pegadinha: 'Passiva preservada vs. bloqueada é o divisor de águas — pular esse teste faz confundir tendinopatia com capsulite adesiva.',
    },
  },

  {
    id: 'capsulite-adesiva',
    area: 'Ombro',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'O ombro que foi congelando',
    paciente: { nome: 'Sandra', idade: 55, perfil: 'professora, diabética tipo 2' },
    vinheta:
      'Sandra, 55 anos, procura você por dor e perda de movimento no ombro esquerdo há 4 meses. Começou com dor sem motivo claro e, com o tempo, ela foi perdendo a capacidade de levantar o braço. Agora dói menos, mas "o braço não sobe".',
    dados_ocultos: {
      anamnese: [
        { tema: 'Evolução em fases', info: 'Começou muito dolorido (inclusive à noite); agora a dor diminuiu, mas a rigidez aumentou. Perda progressiva de movimento em todas as direções.' },
        { tema: 'Comorbidades', info: 'Diabetes tipo 2 há 8 anos, controle irregular. Sem tireoidopatia conhecida.' },
        { tema: 'Trauma e gatilho', info: 'Nega trauma; início insidioso, sem esforço específico.' },
        { tema: 'Cervical e irradiação', info: 'Sem dor cervical, sem formigamento no braço ou mão.' },
        { tema: 'Sinais sistêmicos', info: 'Sem febre, sem perda de peso, sem sudorese noturna.' },
      ],
      exame_fisico: [
        { teste: 'Amplitude ativa e passiva', achado: 'Restrição GLOBAL, com a amplitude PASSIVA tão limitada quanto a ativa — bloqueio real, especialmente na rotação externa.' },
        { teste: 'Padrão capsular', achado: 'Perda proporcional: rotação externa > abdução > rotação interna.' },
        { teste: 'Testes resistidos do manguito', achado: 'Força preservada dentro da amplitude disponível; dor não é o achado dominante.' },
        { teste: 'Triagem cervical', achado: 'Cervical livre; Spurling negativo.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Capsulite adesiva (ombro congelado), provavelmente na fase de rigidez, associada a diabetes. O sinal-chave é a perda da amplitude PASSIVA com padrão capsular.',
      diferenciais: ['Tendinopatia do manguito (afastada: passiva bloqueada, não só dor)', 'Artrose glenoumeral (imagem se necessário)', 'Dor cervical (afastada)'],
      red_flags: 'Ausentes; diabetes é fator de risco, não bandeira vermelha.',
      perguntas_de_ouro: ['A amplitude PASSIVA está bloqueada (não só dolorosa)?', 'A perda de movimento segue padrão capsular (rotação externa primeiro)?', 'Há diabetes ou tireoidopatia?'],
      pegadinha: 'Como a dor já diminuiu, é tentador achar que "está melhorando" — quando na verdade entrou na fase de rigidez e a função piorou.',
    },
  },

  {
    id: 'epicondilalgia-lateral',
    area: 'Cotovelo',
    dificuldade: 'iniciante',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'O cotovelo que não é do tênis',
    paciente: { nome: 'Marcos', idade: 43, perfil: 'eletricista, uso intenso de ferramentas manuais' },
    vinheta:
      'Marcos, 43 anos, eletricista, tem dor na face externa do cotovelo direito há 6 semanas. Piora ao apertar parafusos e ao carregar sacola. Nunca jogou tênis na vida e acha isso estranho, porque disseram que era "cotovelo de tenista".',
    dados_ocultos: {
      anamnese: [
        { tema: 'Gestos que provocam', info: 'Dor ao segurar/torcer objetos e ao estender o punho contra resistência. Aliviada em repouso.' },
        { tema: 'Irradiação e cervical', info: 'Dor local no epicôndilo lateral, pode descer um pouco pelo antebraço; sem formigamento nos dedos, sem dor no pescoço.' },
        { tema: 'Início e carga', info: 'Aumentou o volume de trabalho manual no último mês; início gradual, sem trauma.' },
        { tema: 'Rigidez, inchaço, sinais sistêmicos', info: 'Sem inchaço articular, sem rigidez matinal, sem febre. Outras articulações normais.' },
        { tema: 'Dormência da mão', info: 'Nega dormência ou fraqueza de preensão além da dor.' },
      ],
      exame_fisico: [
        { teste: 'Palpação do epicôndilo lateral', achado: 'Dor localizada e reprodutível na origem dos extensores do punho.' },
        { teste: 'Extensão do punho resistida / teste de Cozen', achado: 'Reproduz a dor no epicôndilo lateral.' },
        { teste: 'Amplitude e estabilidade do cotovelo', achado: 'Amplitude completa e indolor no meio do arco; articulação estável.' },
        { teste: 'Triagem cervical e neural', achado: 'Spurling negativo; sensibilidade e força da mão normais.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Epicondilalgia lateral (tendinopatia dos extensores do punho) por sobrecarga ocupacional. Manejo com carga progressiva e ajuste de atividade.',
      diferenciais: ['Radiculopatia cervical C6/C7 (afastada: Spurling negativo, sem déficit)', 'Instabilidade/artrose do cotovelo (afastada: exame normal)'],
      red_flags: 'Ausentes.',
      perguntas_de_ouro: ['A dor é reproduzida pela extensão resistida do punho?', 'Há formigamento nos dedos ou dor cervical (origem neural)?', 'Como evoluiu a carga de trabalho manual?'],
      pegadinha: 'O nome "cotovelo de tenista" desorienta o paciente e, às vezes, o clínico — a causa é sobrecarga, não o esporte.',
    },
  },

  {
    id: 'dor-femoropatelar',
    area: 'Joelho',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'O joelho da corredora que começou no quadril',
    paciente: { nome: 'Bianca', idade: 26, perfil: 'corredora recreativa, aumentou a quilometragem' },
    vinheta:
      'Bianca, 26 anos, corre há 2 anos e tem dor na frente do joelho direito há 6 semanas. Piora ao descer escadas, agachar e após ficar muito tempo sentada no cinema. Aumentou o volume de corrida antes de a dor começar.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Localização e mecânica', info: 'Dor difusa ao redor/atrás da patela; piora descendo escada, agachando e no "sinal do cinema" (sentar longo). Sem travamento nem falseio.' },
        { tema: 'Progressão de treino', info: 'Subiu de 15 para 30 km/semana em poucas semanas, incluindo treino em ladeira. Sem trauma.' },
        { tema: 'Derrame e bloqueio', info: 'Sem inchaço significativo, sem bloqueio articular, sem sensação de instabilidade.' },
        { tema: 'Quadril e tornozelo', info: 'Refere fraqueza percebida no quadril; nunca fortaleceu glúteos. Sem dor no quadril em si.' },
        { tema: 'Imagem prévia', info: 'Fez ressonância que apontou "condropatia leve"; está assustada com o laudo.' },
      ],
      exame_fisico: [
        { teste: 'Agachamento unilateral', achado: 'Valgo dinâmico evidente e queda pélvica contralateral; reproduz a dor anterior.' },
        { teste: 'Força de abdutores/rotadores externos do quadril', achado: 'Fraqueza de glúteo médio e rotadores externos à direita.' },
        { teste: 'Exame ligamentar e meniscal do joelho', achado: 'Gaveta, Lachman e testes meniscais negativos; sem derrame.' },
        { teste: 'Mobilidade de tornozelo (dorsiflexão)', achado: 'Dorsiflexão levemente reduzida à direita, contribuindo para o valgo.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Síndrome da dor femoropatelar por sobrecarga + déficit de controle proximal (quadril) e de dorsiflexão. O gerador funcional está acima e abaixo do joelho — interdependência regional.',
      diferenciais: ['Lesão meniscal (afastada: sem bloqueio/derrame, testes negativos)', 'Tendinopatia patelar (menos provável: dor difusa peripatelar, não no polo inferior)'],
      red_flags: 'Ausentes.',
      perguntas_de_ouro: ['Há erro de progressão de carga na corrida?', 'Como está o controle do quadril (valgo dinâmico, força de glúteos)?', 'Há travamento/derrame que sugira lesão estrutural interna?'],
      pegadinha: 'O laudo de "condropatia" na ressonância é um achado comum em assintomáticos e ancora paciente e clínico numa causa estrutural, ignorando o déficit de controle motor.',
    },
  },

  {
    id: 'tendinopatia-aquiles',
    area: 'Tornozelo/Pé',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'O calcanhar do corredor de fim de semana',
    paciente: { nome: 'Paulo', idade: 45, perfil: 'gerente, voltou a correr depois de anos parado' },
    vinheta:
      'Paulo, 45 anos, voltou a correr há 2 meses e tem dor no tendão de Aquiles direito, alguns centímetros acima do calcanhar. Dói ao iniciar a corrida e nas primeiras passadas da manhã; melhora ao aquecer. Piora se ele acelera o ritmo.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Rigidez matinal e "aquecimento"', info: 'Dor e rigidez nas primeiras passadas da manhã, que melhoram ao aquecer e voltam depois do esforço — padrão clássico de tendinopatia.' },
        { tema: 'Localização', info: 'Dor 2–6 cm acima da inserção no calcâneo (porção média), não no próprio calcanhar.' },
        { tema: 'Progressão de treino e calçado', info: 'Voltou a correr sem progressão gradual; trocou de tênis recentemente. Sem trauma agudo, sem "estalo".' },
        { tema: 'Episódio agudo / rotura', info: 'Nega dor súbita em "chicotada", nega sensação de perna "chutada"; consegue ficar na ponta do pé.' },
        { tema: 'Sinais sistêmicos / uso de medicação', info: 'Sem febre; sem uso recente de antibiótico quinolona; sem doença reumatológica.' },
      ],
      exame_fisico: [
        { teste: 'Palpação do tendão', achado: 'Espessamento e dor à palpação da porção média do tendão; dor que "migra" com o tendão à dorsiflexão.' },
        { teste: 'Teste de Thompson', achado: 'Negativo — flexão plantar presente ao apertar a panturrilha (afasta rotura completa).' },
        { teste: 'Elevação do calcanhar (single-leg heel raise)', achado: 'Reproduz a dor e mostra déficit de resistência do tríceps sural à direita.' },
        { teste: 'Mobilidade de tornozelo', achado: 'Dorsiflexão reduzida à direita.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Tendinopatia da porção média do tendão de Aquiles por erro de progressão de carga. Manejo com carga progressiva (exercício) e ajuste de treino.',
      diferenciais: ['Rotura do Aquiles (afastada: Thompson negativo, consegue ponta do pé)', 'Tendinopatia insercional (localização diferente — no calcâneo)', 'Bursite retrocalcânea'],
      red_flags: 'Atenção ao uso de quinolonas e a dor súbita em chicotada (rotura) — ambos ausentes aqui.',
      perguntas_de_ouro: ['Houve dor súbita em "chicotada" ou perda de força (rotura)?', 'O padrão é rigidez matinal que melhora aquecendo (tendinopatia)?', 'Como foi a progressão de carga/treino e o calçado?'],
      pegadinha: 'Pular o teste de Thompson pode deixar passar uma rotura parcial/total, que muda completamente a conduta.',
    },
  },

  {
    id: 'fasciopatia-plantar',
    area: 'Pé',
    dificuldade: 'iniciante',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'A primeira pisada da manhã',
    paciente: { nome: 'Dona Célia', idade: 49, perfil: 'cozinheira, muitas horas em pé, sobrepeso' },
    vinheta:
      'Dona Célia, 49 anos, trabalha em pé o dia todo e tem dor embaixo do calcanhar há 2 meses. A dor é pior na primeira pisada ao levantar da cama e depois de ficar sentada um tempo. Ao longo do dia melhora, mas volta ao fim do expediente.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Padrão da dor (primeiro passo)', info: 'Dor intensa nos primeiros passos da manhã e após repouso; melhora ao "soltar" o pé e piora ao fim de longos períodos em pé.' },
        { tema: 'Localização exata', info: 'Dor na região medial do calcâneo, na sola; não é atrás do calcanhar nem no tendão.' },
        { tema: 'Formigamento e irradiação', info: 'Sem formigamento nos dedos, sem queimação irradiando (ajuda a afastar causa neural/túnel do tarso).' },
        { tema: 'Fatores de carga', info: 'Muitas horas em pé, calçado sem amortecimento, ganho de peso recente.' },
        { tema: 'Trauma e sinais sistêmicos', info: 'Sem trauma, sem febre, sem dor noturna em repouso.' },
      ],
      exame_fisico: [
        { teste: 'Palpação do tubérculo medial do calcâneo', achado: 'Dor localizada e reprodutível na origem da fáscia plantar.' },
        { teste: 'Teste de windlass (dorsiflexão do hálux)', achado: 'Reproduz a dor plantar.' },
        { teste: 'Mobilidade do tornozelo e panturrilha', achado: 'Encurtamento de gastrocnêmio e dorsiflexão reduzida.' },
        { teste: 'Exame neural do pé', achado: 'Sensibilidade normal; sem sinal de Tinel no túnel do tarso.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Fasciopatia plantar (dor no primeiro passo, palpação do tubérculo medial e windlass positivos). Manejo: carga/exercício, alongamento do tríceps sural, calçado e manejo de peso.',
      diferenciais: ['Síndrome do túnel do tarso (afastada: sem formigamento, Tinel negativo)', 'Fratura por estresse do calcâneo (afastada: sem dor à compressão lateral/medial, sem trauma)', 'Coxim gorduroso'],
      red_flags: 'Dor em repouso/noturna e sinais sistêmicos ausentes.',
      perguntas_de_ouro: ['A dor é pior no primeiro passo da manhã e após repouso?', 'Há formigamento/queimação (causa neural) ou é só mecânica?', 'Como estão calçado, tempo em pé e peso?'],
      pegadinha: 'Dor de calcanhar tem vários geradores (fáscia, gordura, nervo, osso) — pular a triagem neural e óssea leva a rótulo apressado.',
    },
  },

  {
    id: 'radiculopatia-lombar',
    area: 'Lombar',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'A dor que desce pela perna',
    paciente: { nome: 'Fernando', idade: 41, perfil: 'motorista de aplicativo, muitas horas dirigindo' },
    vinheta:
      'Fernando, 41 anos, motorista, tem dor lombar há 3 semanas que agora "desce" pela parte de trás da perna esquerda até a panturrilha. Sente formigamento na lateral do pé. A dor na perna incomoda mais que a das costas.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Trajeto e formigamento', info: 'Dor irradia da nádega à panturrilha e à lateral do pé (padrão de dermátomo S1), com formigamento; a dor da perna supera a lombar.' },
        { tema: 'O que piora', info: 'Piora ao sentar, tossir e espirrar; alivia deitado. Ficar muito tempo dirigindo agrava.' },
        { tema: 'Bexiga, intestino, sela (bandeiras)', info: 'Controle urinário e intestinal normais; SEM dormência em sela — afasta síndrome da cauda equina.' },
        { tema: 'Força e quedas', info: 'Percebe leve fraqueza ao ficar na ponta do pé esquerdo; nega quedas.' },
        { tema: 'Sinais sistêmicos', info: 'Sem febre, sem perda de peso, sem história de câncer; primeiro episódio de irradiação.' },
      ],
      exame_fisico: [
        { teste: 'Elevação da perna estendida (SLR)', achado: 'Positivo à esquerda — reproduz dor irradiada abaixo do joelho por volta de 40°.' },
        { teste: 'Exame neurológico (S1)', achado: 'Reflexo aquileu diminuído à esquerda; leve fraqueza de flexão plantar; hipoestesia na lateral do pé.' },
        { teste: 'Triagem de cauda equina', achado: 'Sem dormência em sela, sem retenção/incontinência, tônus esfincteriano normal.' },
        { teste: 'Movimentos lombares', achado: 'Flexão reproduz sintomas na perna; extensão tende a centralizar/aliviar.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Radiculopatia lombar S1 (provável hérnia discal), sem sinais de cauda equina nem bandeiras vermelhas. Conduta conservadora com monitorização do déficit neurológico.',
      diferenciais: ['Síndrome da cauda equina (afastada ativamente: sem dormência em sela nem alteração esfincteriana)', 'Lombalgia mecânica simples (afastada: irradiação + déficit S1)'],
      red_flags: 'A bandeira a excluir é a cauda equina (dormência em sela, retenção/incontinência, déficit progressivo bilateral) — triada e negativa aqui.',
      perguntas_de_ouro: ['A dor irradia abaixo do joelho num padrão de dermátomo, com formigamento?', 'Há dormência em sela ou alteração de bexiga/intestino (cauda equina)?', 'Há déficit motor progressivo?'],
      pegadinha: 'Toda lombociatalgia obriga a excluir cauda equina ativamente — é o único cenário que vira urgência cirúrgica.',
    },
  },

  {
    id: 'tunel-carpo',
    area: 'Punho/Mão',
    dificuldade: 'intermediario',
    fonte: 'Caso típico da prática clínica neuromusculoesquelética',
    titulo: 'A mão que dorme de madrugada',
    paciente: { nome: 'Regina', idade: 48, perfil: 'costureira, trabalho repetitivo de precisão' },
    vinheta:
      'Regina, 48 anos, costureira, queixa-se de formigamento e dormência na mão direita há 2 meses, sobretudo à noite — acorda tendo que "sacudir a mão" para aliviar. Às vezes deixa cair objetos pequenos.',
    dados_ocultos: {
      anamnese: [
        { tema: 'Distribuição do formigamento', info: 'Formigamento no polegar, indicador, médio e metade do anelar (território do mediano); poupa o dedo mínimo.' },
        { tema: 'Padrão noturno e alívio', info: 'Piora à noite e ao segurar celular/volante; alivia sacudindo a mão (sinal do flick).' },
        { tema: 'Pescoço', info: 'Sem dor cervical; virar o pescoço não muda os sintomas da mão.' },
        { tema: 'Comorbidades / gestação', info: 'Sem diabetes ou hipotireoidismo conhecidos, não gestante; trabalho manual repetitivo intenso.' },
        { tema: 'Fraqueza e queda de objetos', info: 'Deixa cair objetos pequenos; percebe leve perda de força de pinça.' },
      ],
      exame_fisico: [
        { teste: 'Sinal de Tinel e teste de Phalen no punho', achado: 'Ambos reproduzem formigamento no território do mediano.' },
        { teste: 'Sensibilidade e força tenar', achado: 'Hipoestesia nos dedos do mediano; leve fraqueza/atrofia da eminência tenar (abdutor curto do polegar).' },
        { teste: 'Triagem cervical (Spurling)', achado: 'Negativo; amplitude cervical livre e indolor.' },
        { teste: 'Exame do dedo mínimo (ulnar)', achado: 'Sensibilidade do mínimo preservada — ajuda a localizar no mediano, não no ulnar nem em raiz cervical.' },
      ],
    },
    gabarito: {
      diagnostico_provavel:
        'Síndrome do túnel do carpo (compressão do nervo mediano no punho), quadro ocupacional. O padrão noturno, a distribuição do mediano e os testes de provocação fecham o quadro.',
      diferenciais: ['Radiculopatia cervical C6 (afastada: Spurling negativo, sem dor cervical)', 'Neuropatia ulnar (afastada: mínimo poupado)', 'Polineuropatia (menos provável: unilateral, distribuição focal)'],
      red_flags: 'Atrofia tenar marcada indica compressão avançada — sinal de encaminhamento para avaliação de descompressão.',
      perguntas_de_ouro: ['O formigamento respeita o território do mediano e poupa o dedo mínimo?', 'Há padrão noturno com alívio ao sacudir a mão?', 'A origem é o punho ou o pescoço (Spurling, dor cervical)?'],
      pegadinha: 'Formigamento na mão tem várias origens (punho, cotovelo, plexo, raiz cervical) — não localizar o nível leva a tratar o lugar errado.',
    },
  },
];
