import { type Locale } from './locale'

/** The Velum Labs GPU challenge, online before the hackathon. Dates and rules are still a draft. */
export type ChallengeMessages = {
  back: string
  draft: string
  sponsoredBy: string
  eyebrow: string
  title: string
  lead: string
  facts: { value: string; label: string }[]
  notify: string
  notifyLabel: string
  rules: string
  rulesLabel: string
  levelsTitle: string
  levelsLead: string
  levelWord: string
  levels: {
    name: string
    task: string
    baseline: string
    who: string
    gpu: string
    problems: string[]
  }[]
  levelLabels: { baseline: string; who: string; gpu: string; problems: string }
  howTitle: string
  how: { title: string; copy: string }[]
  judgingTitle: string
  judging: { title: string; copy: string }[]
  prizesTitle: string
  prizesLead: string
  prizes: { place: string; amount: number }[]
  prizesTotal: string
  prizesExtraTitle: string
  prizesExtra: string[]
  timelineTitle: string
  timeline: { date: string; title: string; copy: string }[]
  boardTitle: string
  boardEmpty: string
  boardColumns: { rank: string; who: string; speedup: string }
  faqTitle: string
  faq: { q: string; a: string }[]
  faqMore: string
  seeOther: string
}

export const challengeMessages: Record<Locale, ChallengeMessages> = {
  en: {
    back: 'Hack Infra Futuro',
    draft: 'Draft. Dates and rules can still change.',
    sponsoredBy: 'Sponsored by',
    eyebrow: 'Velum Labs GPU Challenge',
    title: 'Make agents faster',
    lead: 'Three weeks online before the hackathon. Take an open model and make it run faster on our GPUs, from one small kernel up to a whole agent run. The best make it to the finals on stage.',
    facts: [
      { value: '$10,000', label: 'USD in cash and AI credits' },
      { value: '3', label: 'Levels' },
      { value: '13 Nov', label: 'Opens' },
      { value: '5-6 Dec', label: 'Finals' },
    ],
    notify: 'Get notified',
    notifyLabel: 'We write when it opens',
    rules: 'How it works',
    rulesLabel: 'Levels, judging, prizes',
    levelsTitle: 'Three levels',
    levelsLead:
      'Start wherever you like. A valid Level 2 submission unlocks Level 3.',
    levelWord: 'Level',
    levelLabels: {
      baseline: 'You beat',
      who: 'For',
      gpu: 'Runs on',
      problems: 'Problems',
    },
    levels: [
      {
        name: 'Warm-up',
        task: 'Make one small step of the model faster than its plain PyTorch version.',
        baseline: 'A slow PyTorch reference',
        who: 'Anyone who knows Python. A weekend with Triton and a coding agent.',
        gpu: '1× L4',
        problems: ['Fused RMSNorm + residual', 'Top-k sampling'],
      },
      {
        name: 'Core kernels',
        task: 'Make the expensive parts of the model faster than the kernels vLLM and SGLang ship today.',
        baseline: 'Production kernels',
        who: 'Strong engineers who want to go deep on GPUs.',
        gpu: '1× H100',
        problems: ['Attention decode', 'MoE matmul'],
      },
      {
        name: 'Agent speed',
        task: 'Change anything in the serving engine so recorded agent runs finish sooner, with the same answers.',
        baseline: 'Stock vLLM',
        who: 'GPU and systems people. The main prize.',
        gpu: '1× H100, a full node at the finals',
        problems: ['Hidden agent runs, 1 and 8 agents at once'],
      },
    ],
    howTitle: 'How it works',
    how: [
      {
        title: 'Install the CLI',
        copy: 'One command on macOS or Linux. You never need a GPU of your own.',
      },
      {
        title: 'Log in with GitHub',
        copy: 'Your GitHub name goes on the leaderboard. Teams of up to 4.',
      },
      {
        title: 'Pick a problem',
        copy: 'You get a working starter, the reference to match, and a prompt for your coding agent.',
      },
      {
        title: 'Submit',
        copy: 'We check it on a cheap GPU first, then time it on ours and post your score.',
      },
    ],
    judgingTitle: 'How we judge',
    judging: [
      {
        title: 'Correct first',
        copy: 'Your code runs on inputs it has never seen. The output has to match the reference within tolerance, every time.',
      },
      {
        title: 'Then fast',
        copy: 'Yours and the baseline take turns on the same GPU, with the same inputs. Your score is how many times faster you are.',
      },
      {
        title: 'Checked by hand',
        copy: 'Before we pay, we re-run the top 10 on a clean machine and read the code.',
      },
    ],
    prizesTitle: 'Prizes',
    prizesLead: '$10,000 USD in cash and AI credits from Velum Labs. Each level splits its total among its top places, and higher places get more.',
    prizes: [
      { place: 'Level 3 · Agent speed', amount: 6000 },
      { place: 'Level 2 · Core kernels', amount: 2500 },
      { place: 'Level 1 · Warm-up', amount: 1000 },
      { place: 'Best student or first-timer, best write-up', amount: 500 },
    ],
    prizesTotal: 'Total',
    prizesExtraTitle: 'And',
    prizesExtra: [
      'An interview at Velum Labs for every finalist.',
      'The finals on stage at the hackathon, with a full GPU node for 24 hours.',
      'A guaranteed hackathon spot for anyone who beats a baseline.',
    ],
    timelineTitle: 'Dates',
    timeline: [
      {
        date: '13 Nov',
        title: 'Levels 1 and 2 open',
        copy: 'The CLI, the starters and the leaderboard go live.',
      },
      {
        date: '20 Nov',
        title: 'Level 3 opens',
        copy: 'For everyone with a valid Level 2 submission.',
      },
      {
        date: '2 Dec',
        title: 'Online round closes',
        copy: 'We re-run the top submissions and invite the finalists.',
      },
      {
        date: '5-6 Dec',
        title: 'Finals',
        copy: 'At the hackathon, Universidad del Desarrollo. Winners on stage at the close.',
      },
    ],
    boardTitle: 'Leaderboard',
    boardEmpty: 'Opens 13 Nov.',
    boardColumns: { rank: '#', who: 'Team', speedup: 'Speedup' },
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'Do I need my own GPU?',
        a: 'No. You submit code and it runs on GPUs that Velum Labs rents for the challenge.',
      },
      {
        q: 'Can I use coding agents?',
        a: 'Yes. Every problem comes with a prompt to hand to one.',
      },
      {
        q: 'Do I have to come to the hackathon?',
        a: 'Only for the finals. The online round is open from anywhere.',
      },
      {
        q: 'Can I enter as a team?',
        a: 'Yes, up to 4 people, the same as the hackathon.',
      },
    ],
    faqMore: 'Anything else? Write to',
    seeOther: 'En español',
  },
  es: {
    back: 'Hack Infra Futuro',
    draft: 'Borrador. Las fechas y reglas todavía pueden cambiar.',
    sponsoredBy: 'Auspicia',
    eyebrow: 'Velum Labs GPU Challenge',
    title: 'Agentes más rápidos',
    lead: 'Tres semanas online antes de la hackathon. Toma un modelo abierto y haz que corra más rápido en nuestras GPUs, desde un kernel chico hasta un agente completo. Los mejores llegan a la final en el escenario.',
    facts: [
      { value: 'US$10.000', label: 'En efectivo y créditos de IA' },
      { value: '3', label: 'Niveles' },
      { value: '13 nov', label: 'Abre' },
      { value: '5-6 dic', label: 'Final' },
    ],
    notify: 'Avísame',
    notifyLabel: 'Te escribimos cuando abra',
    rules: 'Cómo funciona',
    rulesLabel: 'Niveles, evaluación, premios',
    levelsTitle: 'Tres niveles',
    levelsLead:
      'Empieza donde quieras. Un envío válido en el Nivel 2 desbloquea el Nivel 3.',
    levelWord: 'Nivel',
    levelLabels: {
      baseline: 'Le ganas a',
      who: 'Para',
      gpu: 'Corre en',
      problems: 'Problemas',
    },
    levels: [
      {
        name: 'Warm-up',
        task: 'Haz que un paso chico del modelo corra más rápido que su versión simple en PyTorch.',
        baseline: 'Una referencia lenta en PyTorch',
        who: 'Cualquiera que sepa Python. Un fin de semana con Triton y un agente de código.',
        gpu: '1× L4',
        problems: ['RMSNorm + residual fusionado', 'Sampling top-k'],
      },
      {
        name: 'Kernels centrales',
        task: 'Haz que las partes caras del modelo corran más rápido que los kernels que usan hoy vLLM y SGLang.',
        baseline: 'Kernels de producción',
        who: 'Ingenieros sólidos que quieren meterse a fondo en GPUs.',
        gpu: '1× H100',
        problems: ['Attention decode', 'Matmul MoE'],
      },
      {
        name: 'Velocidad de agentes',
        task: 'Cambia lo que quieras del motor de inferencia para que corridas grabadas de agentes terminen antes, con las mismas respuestas.',
        baseline: 'vLLM sin modificar',
        who: 'Gente de GPUs y sistemas. El premio principal.',
        gpu: '1× H100, un nodo completo en la final',
        problems: ['Corridas de agentes ocultas, 1 y 8 agentes a la vez'],
      },
    ],
    howTitle: 'Cómo funciona',
    how: [
      {
        title: 'Instala el CLI',
        copy: 'Un comando en macOS o Linux. Nunca necesitas una GPU propia.',
      },
      {
        title: 'Entra con GitHub',
        copy: 'Tu nombre de GitHub aparece en el ranking. Equipos de hasta 4.',
      },
      {
        title: 'Elige un problema',
        copy: 'Recibes un starter que funciona, la referencia a igualar y un prompt para tu agente de código.',
      },
      {
        title: 'Envía',
        copy: 'Primero lo revisamos en una GPU barata, después lo medimos en las nuestras y publicamos tu puntaje.',
      },
    ],
    judgingTitle: 'Cómo evaluamos',
    judging: [
      {
        title: 'Primero, correcto',
        copy: 'Tu código corre con entradas que nunca vio. El resultado tiene que coincidir con la referencia dentro de la tolerancia, siempre.',
      },
      {
        title: 'Después, rápido',
        copy: 'Tu versión y la base se turnan en la misma GPU, con las mismas entradas. Tu puntaje es cuántas veces más rápido eres.',
      },
      {
        title: 'Revisado a mano',
        copy: 'Antes de pagar, volvemos a correr el top 10 en una máquina limpia y leemos el código.',
      },
    ],
    prizesTitle: 'Premios',
    prizesLead: 'US$10.000 en efectivo y créditos de IA de Velum Labs. Cada nivel reparte su total entre sus primeros lugares, y los mejores lugares reciben más.',
    prizes: [
      { place: 'Nivel 3 · Velocidad de agentes', amount: 6000 },
      { place: 'Nivel 2 · Kernels centrales', amount: 2500 },
      { place: 'Nivel 1 · Warm-up', amount: 1000 },
      { place: 'Mejor estudiante o primera vez, mejor write-up', amount: 500 },
    ],
    prizesTotal: 'Total',
    prizesExtraTitle: 'Y además',
    prizesExtra: [
      'Una entrevista en Velum Labs para cada finalista.',
      'La final en el escenario de la hackathon, con un nodo completo de GPUs por 24 horas.',
      'Un cupo asegurado en la hackathon para quien le gane a una base.',
    ],
    timelineTitle: 'Fechas',
    timeline: [
      {
        date: '13 nov',
        title: 'Abren los niveles 1 y 2',
        copy: 'Se publican el CLI, los starters y el ranking.',
      },
      {
        date: '20 nov',
        title: 'Abre el nivel 3',
        copy: 'Para quienes tengan un envío válido en el nivel 2.',
      },
      {
        date: '2 dic',
        title: 'Cierra la ronda online',
        copy: 'Volvemos a correr los mejores envíos e invitamos a los finalistas.',
      },
      {
        date: '5-6 dic',
        title: 'Final',
        copy: 'En la hackathon, Universidad del Desarrollo. Ganadores en el escenario al cierre.',
      },
    ],
    boardTitle: 'Ranking',
    boardEmpty: 'Abre el 13 de noviembre.',
    boardColumns: { rank: '#', who: 'Equipo', speedup: 'Speedup' },
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        q: '¿Necesito una GPU propia?',
        a: 'No. Envías código y corre en GPUs que Velum Labs arrienda para el desafío.',
      },
      {
        q: '¿Puedo usar agentes de código?',
        a: 'Sí. Cada problema trae un prompt para pasárselo a uno.',
      },
      {
        q: '¿Tengo que ir a la hackathon?',
        a: 'Solo para la final. La ronda online está abierta desde cualquier lugar.',
      },
      {
        q: '¿Puedo participar en equipo?',
        a: 'Sí, hasta 4 personas, igual que en la hackathon.',
      },
    ],
    faqMore: '¿Algo más? Escribe a',
    seeOther: 'In English',
  },
}
