import { type Locale } from './locale'

export type Messages = {
  skip: string
  sponsorCta: string
  place: string
  venueName: string
  venueAddress: string
  subtitle: string
  whyTitle: string
  whyHighlight: string
  whyRest: string
  whyBody: string
  statsLabel: string
  stats: { value: string; label: string }[]
  orgsTitle: string
  orgs: { title: string; copy: string }[]
  tracksTitle: string
  trackGroups: {
    title: string
    tracks: { n: string; title: string; copy: string }[]
  }[]
  sponsorsTitle: string
  sponsorsLead: string
  sponsorsHighlight: string
  sponsors: { title: string; copy: string }[]
  asksTitle: string
  asks: { n: string; title: string; copy: string }[]
  tiersTitle: string
  tiers: { title: string; copy: string; label: string }[]
  writeTitle: string
  writeLead: string
  writeHighlight: string
  linkedin: string
  seeOther: string
}

export type OrgId = 'velum' | 'indies' | 'ae'

export type SponsorId = 'elevenlabs' | 'firecrawl' | 'markip' | 'wispr-flow' | 'croma'

type SponsorOffer = {
  audience: string
  benefit: string
  details: string
}

export type SponsorMessages = {
  description: string
  useCase: string
  benefits:
    | { status: 'confirmed'; offers: readonly [SponsorOffer, ...SponsorOffer[]] }
    | { status: 'pending'; message: string }
}

/** World-facing homepage. The sponsor deck lives at /deck. */
export type HomeMessages = {
  skip: string
  heroDate: string
  heroTitle: string
  sponsorLogosTitle: string
  game: {
    powers: { wide: string; multi: string; slow: string; life: string }
    exit: string
    close: string
    launch: string
    win: string
    over: string
    again: string
    lives: string
    playAgain: string
    best: string
    board: string
    viewLeaderboard: string
    name: string
    nameHint: string
    badName: string
    kept: (best: string) => string
    save: string
    saving: string
    rank: (n: number) => string
    offline: string
  }
  runner: { jump: string; best: string; board: string; offline: string; sound: string; mute: string; unmute: string }
  register: string
  applyHere: string
  participants: string
  sponsor: string
  companies: string
  stuckLead: string
  stuckBody: string
  facts: string
  handLabel: string
  prizePoolTitle: string
  prizePoolEstimate: string
  tracksTitle: string
  trackGroups: {
    title: string
    tracks: { title: string; copy: string }[]
  }[]
  sponsors: Record<SponsorId, SponsorMessages>
  orgs: Record<OrgId, string>
  behindTitle: string
  faqTitle: string
  faq: { q: string; a: string }[]
  faqMore: string
  faqSponsor: string
  seeOther: string
}

export const homeMessages: Record<Locale, HomeMessages> = {
  en: {
    skip: 'Skip to content',
    heroDate: 'December 5-6, Universidad del Desarrollo, Las Condes',
    heroTitle: 'The biggest hackathon in Chile, ever',
    sponsorLogosTitle: 'Sponsors',
    game: {
      powers: { wide: 'Wide paddle', multi: '×3', slow: 'Slow-mo', life: '+1 life' },
      exit: 'Esc to exit',
      close: 'Exit',
      launch: 'Click or space to launch',
      win: 'You win!',
      over: 'Game over',
      again: 'Space to play again',
      lives: 'Lives',
      playAgain: 'Play again',
      best: 'Best',
      board: 'Fastest wins',
      viewLeaderboard: 'View leaderboard →',
      name: 'Your GitHub username',
      nameHint: 'One spot per GitHub user: your best counts.',
      badName: "That isn't a GitHub username",
      kept: (best) => `Your best stays ${best}`,
      save: 'Save',
      saving: 'Saving…',
      rank: (n) => `You're #${n}`,
      offline: "Couldn't save your time",
    },
    runner: { jump: 'Space or tap to jump · ↓ to duck', best: 'HI', board: 'Top scores', offline: "Couldn't save your score", sound: 'Sound', mute: 'Mute sound', unmute: 'Unmute sound' },
    register: 'Register your team',
    applyHere: 'Apply here',
    participants: 'Participants',
    sponsor: 'I want to sponsor',
    companies: 'Companies',
    stuckLead: "Agents get stuck when they can't access real systems.",
    stuckBody:
      'Public data nobody can query, internal processes nobody can run, and tools that never make it into production.',
    facts:
      'On 5-6 Dec 2026 in Santiago, around 500 people will spend 24 hours tackling that. Apply solo or in a team of up to 4. Application only.',
    handLabel: 'A hand moving, drawn in ASCII.',
    prizePoolTitle: 'Cash prizes',
    prizePoolEstimate: 'Around 11.8 million Chilean pesos.',
    sponsors: {
      elevenlabs: {
        description: 'ElevenLabs is an AI audio platform.',
        useCase: 'Build voice agents, turn text into speech, and transcribe audio.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'All participants',
              benefit: '1 month of Creator, free',
              details: '131,000 credits. Normally USD 22/month.',
            },
            {
              audience: 'First place',
              benefit: '3 months of Pro for each team member',
              details: '600,000 credits/month. USD 297 value per team member.',
            },
            {
              audience: 'Best use of ElevenLabs',
              benefit: '3 months of Scale for each team member',
              details: '1,800,000 credits/month. USD 897 value per team member.',
            },
          ],
        },
      },
      firecrawl: {
        description: 'Firecrawl is a web data API for AI.',
        useCase: 'Search the web and turn websites into structured data for your agents.',
        benefits: {
          status: 'pending',
          message: 'Sponsorship details to be announced.',
        },
      },
      markip: {
        description: 'Markip provides trademark advice and registration services.',
        useCase: 'Get guidance on your brand and check whether your project name could be registered as a trademark.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'All participants',
              benefit: 'On-site trademark advice and an exclusive discount',
              details: 'No-obligation advice and an attendee discount valid after the event.',
            },
            {
              audience: 'First place',
              benefit: 'Registration of one trademark in one class',
              details: 'All professional fees waived and initial fees covered. Approximate value: CLP 327,000.',
            },
            {
              audience: 'Second and third place',
              benefit: 'Trademark registration with professional fees waived',
              details: 'One trademark for each team. Value: CLP 240,000 per trademark.',
            },
          ],
        },
      },
      'wispr-flow': {
        description: 'Wispr Flow is voice dictation built for developers.',
        useCase: 'Dictate code, prompts, and commits in your editor, 4 times faster than typing.',
        benefits: {
          status: 'pending',
          message: 'Sponsorship details yet to be revealed.',
        },
      },
      croma: {
        description: 'Croma is a government data API for AI agents.',
        useCase: 'Look up court cases, companies, sanctions, vehicles, procurement, and legislation from official sources in 9 countries.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'All participants',
              benefit: '1 month of Hobby, free',
              details: '20,000 credits. Normally USD 20/month.',
            },
            {
              audience: 'First place',
              benefit: '3 months of Pro for each team member',
              details: '350,000 credits/month. USD 299/month value per team member.',
            },
            {
              audience: 'Second and third place',
              benefit: '2 months of Standard for each team member',
              details: '100,000 credits/month. USD 99/month value per team member.',
            },
          ],
        },
      },
    },
    orgs: {
      velum: 'AI startup, Chilean founders. First into YC in almost three years.',
      indies:
        'Startup community running in-person events. Last hackathon was the biggest social-impact one in Latin America, five countries.',
      ae: 'Every university entrepreneurship club in Chile. In 2026: ~3000 signed up, 1800+ showed up.',
    },
    tracksTitle: 'Tracks',
    trackGroups: [
      {
        title: 'Open tracks',
        tracks: [
          {
            title: 'Agent-ready government',
            copy: 'Public data and systems an agent can look up and act on.',
          },
          {
            title: 'Agent infrastructure',
            copy: 'Tools for building, shipping, and running agents.',
          },
        ],
      },
      {
        title: 'Sponsor tracks',
        tracks: [
          { title: 'Flyra', copy: 'To be announced.' },
          { title: 'Payku', copy: 'To be announced.' },
        ],
      },
    ],
    behindTitle: "Who's behind it",
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'When and where is it?',
        a: '5-6 December 2026, in person, in Santiago, Chile. It runs for 24 hours. Registered teams get the details by email.',
      },
      {
        q: 'Who can take part?',
        a: 'You can apply solo or in a team of up to 4 people. No teams of 5. We expect around 500 people in total.',
      },
      {
        q: 'How do I get in?',
        a: "You apply. Register your team on this site and everyone on it gets a confirmation email. We'll write soon to say whether you're in.",
      },
      {
        q: 'Do I need to code?',
        a: "The application asks if you code day to day. If you do, we need your GitHub. If you don't, your LinkedIn.",
      },
      {
        q: 'What will we build?',
        a: 'Agents that work against real systems. There are two open tracks, agent-ready government and agent infrastructure, plus sponsor tracks from Flyra and Payku.',
      },
      {
        q: 'Can my company get involved?',
        a: 'Yes. We are looking for money, API credits, or a venue.',
      },
    ],
    faqMore: 'Anything else? Write to',
    faqSponsor: 'Sponsor details',
    seeOther: 'En español',
  },
  es: {
    skip: 'Saltar al contenido',
    heroDate: '5 y 6 de diciembre, Universidad del Desarrollo, Las Condes',
    heroTitle: 'La hackathon más grande en la historia de Chile',
    sponsorLogosTitle: 'Auspician',
    game: {
      powers: { wide: 'Paleta ancha', multi: '×3', slow: 'Cámara lenta', life: '+1 vida' },
      exit: 'Esc para salir',
      close: 'Salir',
      launch: 'Clic o espacio para lanzar',
      win: '¡Ganaste!',
      over: 'Fin del juego',
      again: 'Espacio para jugar de nuevo',
      lives: 'Vidas',
      playAgain: 'Jugar de nuevo',
      best: 'Récord',
      board: 'Los más rápidos',
      viewLeaderboard: 'Ver leaderboard →',
      name: 'Tu usuario de GitHub',
      nameHint: 'Un puesto por usuario de GitHub: cuenta tu mejor marca.',
      badName: 'Eso no es un usuario de GitHub',
      kept: (best) => `Tu mejor marca sigue en ${best}`,
      save: 'Guardar',
      saving: 'Guardando…',
      rank: (n) => `Quedaste #${n}`,
      offline: 'No pudimos guardar tu tiempo',
    },
    runner: { jump: 'Espacio o toca para saltar · ↓ para agacharte', best: 'Récord', board: 'Mejores puntajes', offline: 'No pudimos guardar tu puntaje', sound: 'Sonido', mute: 'Silenciar', unmute: 'Activar sonido' },
    register: 'Inscribe tu equipo',
    applyHere: 'Postula aquí',
    participants: 'Participantes',
    sponsor: 'Quiero auspiciar',
    companies: 'Empresas',
    stuckLead: 'Los agentes se traban cuando no pueden entrar a sistemas reales.',
    stuckBody:
      'Datos públicos que nadie puede consultar, procesos internos que nadie puede correr, y herramientas que nunca llegan a producción.',
    facts:
      'El 5 y 6 de diciembre de 2026, en Santiago, unas 500 personas van a pasar 24 horas en eso. Postula solo o en un equipo de hasta 4. Solo por postulación.',
    handLabel: 'Una mano en movimiento, dibujada en ASCII.',
    prizePoolTitle: 'Premios en efectivo',
    prizePoolEstimate: 'Aprox. 11,8 millones de pesos chilenos.',
    sponsors: {
      elevenlabs: {
        description: 'ElevenLabs es una plataforma de audio con IA.',
        useCase: 'Crea agentes de voz, convierte texto en voz y transcribe audio.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'Todos los participantes',
              benefit: '1 mes de Creator gratis',
              details: '131.000 créditos. Precio habitual: USD 22/mes.',
            },
            {
              audience: 'Primer lugar',
              benefit: '3 meses de Pro para cada integrante',
              details: '600.000 créditos/mes. Valor de USD 297 por integrante.',
            },
            {
              audience: 'Mejor uso de ElevenLabs',
              benefit: '3 meses de Scale para cada integrante',
              details: '1.800.000 créditos/mes. Valor de USD 897 por integrante.',
            },
          ],
        },
      },
      firecrawl: {
        description: 'Firecrawl es una API de datos web para IA.',
        useCase: 'Busca en la web y convierte sitios en datos estructurados para tus agentes.',
        benefits: {
          status: 'pending',
          message: 'Detalles del auspicio por anunciar.',
        },
      },
      markip: {
        description: 'Markip ofrece asesoría y servicios de registro de marcas.',
        useCase: 'Resuelve dudas sobre tu marca y revisa la viabilidad de registrar el nombre de tu proyecto.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'Todos los participantes',
              benefit: 'Asesorías presenciales y un descuento exclusivo',
              details: 'Asesorías sin compromiso y descuento para asistentes válido después del evento.',
            },
            {
              audience: 'Primer lugar',
              benefit: 'Registro de una marca en una clase',
              details: 'Honorarios 100% liberados y tasas iniciales cubiertas. Valor aproximado: CLP 327.000.',
            },
            {
              audience: 'Segundo y tercer lugar',
              benefit: 'Registro de una marca con honorarios sin costo',
              details: 'Una marca para cada equipo. Valor: CLP 240.000 por marca.',
            },
          ],
        },
      },
      'wispr-flow': {
        description: 'Wispr Flow es una app de dictado por voz hecha para programar.',
        useCase: 'Dicta código, prompts y commits en tu editor, 4 veces más rápido que teclear.',
        benefits: {
          status: 'pending',
          message: 'Detalles del auspicio por revelar.',
        },
      },
      croma: {
        description: 'Croma es una API de datos gubernamentales para agentes de IA.',
        useCase: 'Consulta causas judiciales, empresas, sanciones, vehículos, licitaciones y legislación desde fuentes oficiales en 9 países.',
        benefits: {
          status: 'confirmed',
          offers: [
            {
              audience: 'Todos los participantes',
              benefit: '1 mes de Hobby gratis',
              details: '20.000 créditos. Precio habitual: USD 20/mes.',
            },
            {
              audience: 'Primer lugar',
              benefit: '3 meses de Pro para cada integrante',
              details: '350.000 créditos/mes. Valor de USD 299/mes por integrante.',
            },
            {
              audience: 'Segundo y tercer lugar',
              benefit: '2 meses de Standard para cada integrante',
              details: '100.000 créditos/mes. Valor de USD 99/mes por integrante.',
            },
          ],
        },
      },
    },
    orgs: {
      velum: 'Startup de IA, founders chilenos. Los primeros en entrar a YC en casi tres años.',
      indies:
        'Comunidad de startups con eventos presenciales. La última hackathon fue la de impacto social más grande de Latinoamérica, en cinco países.',
      ae: 'Todos los clubes de emprendimiento universitarios de Chile. En 2026: ~3000 inscritos, 1800+ asistentes.',
    },
    tracksTitle: 'Tracks',
    trackGroups: [
      {
        title: 'Tracks abiertos',
        tracks: [
          {
            title: 'Agent-ready government',
            copy: 'Datos y sistemas públicos que un agente pueda consultar y usar.',
          },
          {
            title: 'Agent infrastructure',
            copy: 'Herramientas para armar, publicar y correr agentes.',
          },
        ],
      },
      {
        title: 'Tracks de sponsors',
        tracks: [
          { title: 'Flyra', copy: 'Por anunciar.' },
          { title: 'Payku', copy: 'Por anunciar.' },
        ],
      },
    ],
    behindTitle: 'Quién está detrás',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        q: '¿Cuándo y dónde es?',
        a: 'El 5 y 6 de diciembre de 2026, presencial, en Santiago de Chile. Dura 24 horas. Los equipos inscritos reciben los detalles por correo.',
      },
      {
        q: '¿Quién puede participar?',
        a: 'Puedes postular solo o en un equipo de hasta 4 personas. No hay equipos de 5. Esperamos unas 500 personas en total.',
      },
      {
        q: '¿Cómo entro?',
        a: 'Se entra por postulación. Inscribe a tu equipo en este sitio y todos reciben un correo de confirmación. Les avisamos pronto si quedaron.',
      },
      {
        q: '¿Tengo que programar?',
        a: 'La postulación pregunta si programas en tu día a día. Si programas, necesitamos tu GitHub. Si no, tu LinkedIn.',
      },
      {
        q: '¿Qué vamos a construir?',
        a: 'Agentes que funcionen con sistemas reales. Hay dos tracks abiertos, agent-ready government y agent infrastructure, más tracks de sponsors de Flyra y Payku.',
      },
      {
        q: '¿Mi empresa puede participar?',
        a: 'Sí. Buscamos dinero, créditos de API o un espacio.',
      },
    ],
    faqMore: '¿Algo más? Escribe a',
    faqSponsor: 'Detalles para sponsors',
    seeOther: 'In English',
  },
}

export const messages: Record<Locale, Messages> = {
  en: {
    skip: 'Skip to content',
    sponsorCta: 'Be a sponsor',
    place: '5-6 Dec 2026. Santiago, Chile',
    venueName: 'Universidad del Desarrollo',
    venueAddress: 'Av. Plaza 680, Las Condes',
    subtitle: '24 hours, ~500 people, infrastructure agents can actually use.',
    whyTitle: 'Why',
    whyHighlight: "Agents get stuck when they can't get into a real system.",
    whyRest:
      'Public data nobody can query, company processes nobody can run, tools that never make it out.',
    whyBody:
      'On 5-6 Dec 2026 in Santiago, about 500 people will spend 24 hours on that. Apply solo or in a team of up to 4. You apply to get in.',
    statsLabel: 'Numbers',
    stats: [
      { value: '24', label: 'Hours' },
      { value: '~500', label: 'People' },
      { value: '10k', label: 'USD in so far' },
      { value: '4', label: 'Tracks' },
    ],
    orgsTitle: "Who's behind this",
    orgs: [
      {
        title: 'Velum Labs (YC P26)',
        copy: 'AI startup, Chilean founders. First ones into YC in almost three years.',
      },
      {
        title: 'indies.cl',
        copy: 'Startup community. They run in-person events. The last hackathon was the biggest social-impact one in Latin America, five countries.',
      },
      {
        title: 'Alianza Emprende',
        copy: 'Every university entrepreneurship club in Chile. In 2026: ~3000 signed up, over 1800 showed up.',
      },
    ],
    tracksTitle: 'Tracks',
    trackGroups: [
      {
        title: 'Open tracks',
        tracks: [
          {
            n: '01',
            title: 'Agent-ready government',
            copy: 'Public data and systems an agent can look up and act on.',
          },
          {
            n: '02',
            title: 'Agent infrastructure',
            copy: 'Tools for building, shipping, and running agents.',
          },
        ],
      },
      {
        title: 'Sponsor tracks',
        tracks: [
          { n: '03', title: 'Flyra', copy: 'To be announced.' },
          { n: '04', title: 'Payku', copy: 'To be announced.' },
        ],
      },
    ],
    sponsorsTitle: 'Why sponsor this',
    sponsorsLead: 'For 24 hours, teams we pick will build on real products.',
    sponsorsHighlight: 'You put your tech in their hands.',
    sponsors: [
      {
        title: 'They use it',
        copy: 'Teams spend 24 hours on your product, not a slide.',
      },
      {
        title: 'Talent',
        copy: 'You meet technical people we already filtered, before and during the event.',
      },
      {
        title: 'Real work',
        copy: 'Prototypes on your stack, for actual government and company problems.',
      },
      {
        title: 'Take part',
        copy: 'Back a challenge or a prize, or do a talk or a workshop.',
      },
    ],
    asksTitle: 'What we need',
    asks: [
      {
        n: '01',
        title: 'Money',
        copy: "Cash for ops, food, and prizes. There's already 10k USD.",
      },
      {
        n: '02',
        title: 'Credits',
        copy: 'For about 500 people, or for the three winning teams.',
      },
      {
        n: '03',
        title: 'A venue',
        copy: 'Tables, internet, outlets.',
      },
    ],
    tiersTitle: 'How to sponsor',
    tiers: [
      {
        title: 'Bronze',
        copy: 'Your name on the site and at the event, plus intros to teams and people who want to talk.',
        label: 'Bronze cup',
      },
      {
        title: 'Silver',
        copy: 'Bronze, plus a challenge or prize and a talk or workshop.',
        label: 'Silver cup',
      },
      {
        title: 'Gold',
        copy: 'Silver, plus you own a track, and you meet the people we already picked first.',
        label: 'Gold cup',
      },
    ],
    writeTitle: 'Be a sponsor',
    writeLead:
      'Tell him what you can bring (money, credits, or a venue) and why this one matters to you.',
    writeHighlight:
      'Come in early and we build the challenges, prizes, and space around you.',
    linkedin: "Benjamin's LinkedIn",
    seeOther: 'En español',
  },
  es: {
    skip: 'Saltar al contenido',
    sponsorCta: 'Súmate como sponsor',
    place: '5-6 dic 2026. Santiago, Chile',
    venueName: 'Universidad del Desarrollo',
    venueAddress: 'Av. Plaza 680, Las Condes',
    subtitle:
      '24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad.',
    whyTitle: 'Por qué',
    whyHighlight: 'Un agente se traba cuando no puede entrar a un sistema real.',
    whyRest:
      'Datos públicos que nadie puede consultar, procesos de empresa que nadie puede correr, herramientas que nunca salen.',
    whyBody:
      'El 5 y 6 de diciembre de 2026, en Santiago, unas 500 personas van a pasar 24 horas en eso. Postula solo o en un equipo de hasta 4. Se entra por postulación.',
    statsLabel: 'Números',
    stats: [
      { value: '24', label: 'Horas' },
      { value: '~500', label: 'Personas' },
      { value: '10 mil', label: 'USD ya levantados' },
      { value: '4', label: 'Tracks' },
    ],
    orgsTitle: 'Quién lo organiza',
    orgs: [
      {
        title: 'Velum Labs (YC P26)',
        copy: 'Startup de IA, founders chilenos. Los primeros en entrar a YC en casi tres años.',
      },
      {
        title: 'indies.cl',
        copy: 'Comunidad de gente que arma startups. Hacen eventos presenciales. El último fue la hackathon de impacto social más grande de Latinoamérica, en cinco países.',
      },
      {
        title: 'Alianza Emprende',
        copy: 'Todos los clubes de emprendimiento universitarios de Chile. En 2026: ~3000 inscritos y más de 1800 asistentes.',
      },
    ],
    tracksTitle: 'Tracks',
    trackGroups: [
      {
        title: 'Tracks abiertos',
        tracks: [
          {
            n: '01',
            title: 'Agent-ready government',
            copy: 'Datos y sistemas públicos que un agente pueda consultar y usar.',
          },
          {
            n: '02',
            title: 'Agent infrastructure',
            copy: 'Herramientas para armar, publicar y correr agentes.',
          },
        ],
      },
      {
        title: 'Tracks de sponsors',
        tracks: [
          { n: '03', title: 'Flyra', copy: 'Por anunciar.' },
          { n: '04', title: 'Payku', copy: 'Por anunciar.' },
        ],
      },
    ],
    sponsorsTitle: 'Por qué ser sponsor',
    sponsorsLead:
      'Durante 24 horas, equipos que ya escogimos van a construir con productos reales.',
    sponsorsHighlight: 'Un sponsor pone su tecnología en esas manos.',
    sponsors: [
      {
        title: 'Lo usan',
        copy: 'Los equipos pasan 24 horas en tu producto, no en una slide.',
      },
      {
        title: 'Talento',
        copy: 'Conoces a gente técnica que ya escogimos, antes y durante el evento.',
      },
      {
        title: 'Trabajo real',
        copy: 'Prototipos en tu stack, para problemas reales de gobierno y empresa.',
      },
      {
        title: 'Participa',
        copy: 'Auspicia un desafío o un premio, o arma una charla o un workshop.',
      },
    ],
    asksTitle: 'Qué pedimos',
    asks: [
      {
        n: '01',
        title: 'Dinero',
        copy: 'Dinero para el evento, comida y premios. Ya hay 10 mil USD.',
      },
      {
        n: '02',
        title: 'Créditos',
        copy: 'Para unas 500 personas, o para los tres equipos ganadores.',
      },
      {
        n: '03',
        title: 'Espacio',
        copy: 'Un espacio con mesas, internet y enchufes.',
      },
    ],
    tiersTitle: 'Cómo ser sponsor',
    tiers: [
      {
        title: 'Bronce',
        copy: 'Tu nombre en el sitio y en el evento, más intros con equipos y gente que quiere conversar.',
        label: 'Copa de bronce',
      },
      {
        title: 'Plata',
        copy: 'Bronce, más un desafío o premio y una charla o workshop.',
        label: 'Copa de plata',
      },
      {
        title: 'Oro',
        copy: 'Plata, más un track a tu nombre, y conoces primero a la gente que ya escogimos.',
        label: 'Copa de oro',
      },
    ],
    writeTitle: 'Súmate como sponsor',
    writeLead:
      'Escríbele qué puedes poner (dinero, créditos o un espacio) y por qué te interesa esta hackathon.',
    writeHighlight:
      'Si te sumas temprano, armamos los desafíos, los premios y el espacio alrededor tuyo.',
    linkedin: 'LinkedIn de Benjamin',
    seeOther: 'In English',
  },
}
