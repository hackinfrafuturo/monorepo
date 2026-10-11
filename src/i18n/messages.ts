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
  tracks: { n: string; title: string; copy: string }[]
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

/** World-facing homepage. The sponsor deck lives at /sponsor. */
export type HomeMessages = {
  skip: string
  heroDate: string
  heroVenue: string
  heroAddress: string
  heroTitle: string
  heroSub: string
  register: string
  participants: string
  sponsor: string
  companies: string
  stuckLead: string
  stuckBody: string
  facts: string
  handLabel: string
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
    heroDate: 'November 7–8, Santiago, Chile',
    heroVenue: 'Nido Lucía',
    heroAddress: 'San Isidro 85, Santiago Centro',
    heroTitle: 'The biggest hackathon in Chile, ever',
    heroSub:
      'An infrastructure hackathon focused on building the future of business. Devtools, agents.',
    register: 'Register your team',
    participants: 'Participants',
    sponsor: 'I want to sponsor',
    companies: 'Companies',
    stuckLead: "Agents get stuck when they can't access real systems.",
    stuckBody:
      'Public data nobody can query, internal processes nobody can run, and tools that never make it into production.',
    facts:
      'On 7–8 Nov 2026 in Santiago, around 500 people will spend 24 hours tackling that. Apply solo or in a team of up to 4. Application only.',
    handLabel: 'A hand moving, drawn in ASCII.',
    orgs: {
      velum: 'AI startup, Chilean founders. First into YC in almost three years.',
      indies:
        'Startup community running in-person events. Last hackathon was the biggest social-impact one in Latin America, five countries.',
      ae: 'Every university entrepreneurship club in Chile. In 2026: ~3000 signed up, 1800+ showed up.',
    },
    behindTitle: "Who's behind it",
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'When and where is it?',
        a: '7–8 November 2026, in person, in Santiago, Chile. It runs for 24 hours. Registered teams get the details by email.',
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
        a: 'Agents that work against real systems. There are three tracks: agent-ready government, agent-ready business, and agent infrastructure.',
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
    heroDate: '7 y 8 de noviembre, Santiago, Chile',
    heroVenue: 'Nido Lucía',
    heroAddress: 'San Isidro 85, Santiago Centro',
    heroTitle: 'La hackathon más grande de la historia de Chile',
    heroSub:
      'Una hackathon de infraestructura para construir el futuro de los negocios. Devtools, agentes.',
    register: 'Inscribe tu equipo',
    participants: 'Participantes',
    sponsor: 'Quiero auspiciar',
    companies: 'Empresas',
    stuckLead: 'Los agentes se traban cuando no pueden entrar a sistemas reales.',
    stuckBody:
      'Datos públicos que nadie puede consultar, procesos internos que nadie puede correr, y herramientas que nunca llegan a producción.',
    facts:
      'El 7 y 8 de noviembre de 2026, en Santiago, unas 500 personas van a pasar 24 horas en eso. Postula solo o en un equipo de hasta 4. Solo por postulación.',
    handLabel: 'Una mano en movimiento, dibujada en ASCII.',
    orgs: {
      velum: 'Startup de IA, founders chilenos. Los primeros en entrar a YC en casi tres años.',
      indies:
        'Comunidad de startups con eventos presenciales. La última hackathon fue la de impacto social más grande de Latinoamérica, en cinco países.',
      ae: 'Todos los clubes de emprendimiento universitarios de Chile. En 2026: ~3000 inscritos, 1800+ asistentes.',
    },
    behindTitle: 'Quién está detrás',
    faqTitle: 'Preguntas frecuentes',
    faq: [
      {
        q: '¿Cuándo y dónde es?',
        a: 'El 7 y 8 de noviembre de 2026, presencial, en Santiago de Chile. Dura 24 horas. Los equipos inscritos reciben los detalles por correo.',
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
        a: 'Agentes que funcionen con sistemas reales. Hay tres tracks: agent-ready government, agent-ready business y agent infrastructure.',
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
    place: '7–8 Nov 2026. Santiago, Chile',
    venueName: 'Nido Lucía',
    venueAddress: 'San Isidro 85, Santiago Centro',
    subtitle: '24 hours, ~500 people, infrastructure agents can actually use.',
    whyTitle: 'Why',
    whyHighlight: "Agents get stuck when they can't get into a real system.",
    whyRest:
      'Public data nobody can query, company processes nobody can run, tools that never make it out.',
    whyBody:
      'On 7–8 Nov 2026 in Santiago, about 500 people will spend 24 hours on that. Apply solo or in a team of up to 4. You apply to get in.',
    statsLabel: 'Numbers',
    stats: [
      { value: '24', label: 'Hours' },
      { value: '~500', label: 'People' },
      { value: '10k', label: 'USD in so far' },
      { value: '3', label: 'Tracks' },
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
    tracks: [
      {
        n: '01',
        title: 'Agent-ready government',
        copy: 'Public data and systems an agent can look up and act on.',
      },
      {
        n: '02',
        title: 'Agent-ready business',
        copy: 'Agents wired into real company data and workflows.',
      },
      {
        n: '03',
        title: 'Agent infrastructure',
        copy: 'Tools for building, shipping, and running agents.',
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
    place: '7–8 nov 2026. Santiago, Chile',
    venueName: 'Nido Lucía',
    venueAddress: 'San Isidro 85, Santiago Centro',
    subtitle:
      '24 horas, ~500 personas, infraestructura que un agente pueda usar de verdad.',
    whyTitle: 'Por qué',
    whyHighlight: 'Un agente se traba cuando no puede entrar a un sistema real.',
    whyRest:
      'Datos públicos que nadie puede consultar, procesos de empresa que nadie puede correr, herramientas que nunca salen.',
    whyBody:
      'El 7 y 8 de noviembre de 2026, en Santiago, unas 500 personas van a pasar 24 horas en eso. Postula solo o en un equipo de hasta 4. Se entra por postulación.',
    statsLabel: 'Números',
    stats: [
      { value: '24', label: 'Horas' },
      { value: '~500', label: 'Personas' },
      { value: '10 mil', label: 'USD ya levantados' },
      { value: '3', label: 'Tracks' },
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
    tracks: [
      {
        n: '01',
        title: 'Agent-ready government',
        copy: 'Datos y sistemas públicos que un agente pueda consultar y usar.',
      },
      {
        n: '02',
        title: 'Agent-ready business',
        copy: 'Agentes conectados a los datos y procesos de empresas reales.',
      },
      {
        n: '03',
        title: 'Agent infrastructure',
        copy: 'Herramientas para armar, publicar y correr agentes.',
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
