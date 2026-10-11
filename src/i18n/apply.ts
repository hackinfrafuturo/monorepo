import type { Locale } from './locale'
import type { Diet, ErrorKey, Gender, YesNo } from '../apply/model'

export type ApplyMessages = {
  home: string
  kicker: string
  back: string
  next: string
  edit: string
  optional: string
  progress: { label: string; text: (n: number, total: number) => string }
  size: { title: string; hint: string; people: (n: number) => string }
  member: {
    title: (n: number, total: number) => string
    hintFirst: string
    hintNext: string
    fallback: (n: number) => string
  }
  review: {
    title: string
    hint: string
    submit: string
    sending: string
    failed: string
  }
  done: { title: string; body: string; sentTo: string; home: string }
  fields: {
    ref: { label: string; hint: string; placeholder: string }
    name: { label: string }
    gender: { label: string; placeholder: string; options: Record<Gender, string> }
    github: { label: string; prefix: string; placeholder: string }
    email: { label: string; placeholder: string }
    coding: { label: string; hint: string; options: Record<YesNo, string> }
    linkedin: { label: string; prefix: string; placeholder: string }
    site: { label: string; placeholder: string }
    jobs: { label: string; options: Record<YesNo, string> }
    role: { label: string; placeholder: string }
    deep: { label: string; hint: string }
    hardest: { label: string; hint: string }
    favorite: { label: string; hint: string }
    diet: { label: string; options: Record<Diet, string> }
    allergies: { label: string; hint: string }
  }
  errors: Record<ErrorKey, string>
}

export const applyMessages: Record<Locale, ApplyMessages> = {
  en: {
    home: 'Go home',
    kicker: 'November 7–8, Santiago',
    back: 'Back',
    next: 'Next',
    edit: 'Edit',
    optional: 'optional',
    progress: { label: 'Progress', text: (n, total) => `Step ${n} of ${total}` },
    size: {
      title: 'How many of you?',
      hint: 'Apply solo or with a team of up to 4. No teams of 5.',
      people: (n) => `${n} ${n === 1 ? 'person' : 'people'}`,
    },
    member: {
      title: (n, total) => `Person ${n} of ${total}`,
      hintFirst: 'Start with your details.',
      hintNext: 'Now the next person on the team.',
      fallback: (n) => `Person ${n}`,
    },
    review: {
      title: 'Check your team',
      hint: "When you register, we'll send a confirmation to everyone on the team. We'll be in touch soon with details and whether you're in.",
      submit: 'Register team',
      sending: 'Sending…',
      failed: "We couldn't send your registration. Try again.",
    },
    done: {
      title: 'Team registered',
      body: "We received your team's application. Confirmation emails are on their way. We'll be in touch soon with details and whether you got in.",
      sentTo: 'Registered emails',
      home: 'Back to home',
    },
    fields: {
      ref: {
        label: 'Referral code',
        hint: 'Where did you hear about us? Enter a code or organization name.',
        placeholder: 'e.g. UC or Alianza Emprende',
      },
      name: { label: 'Name or nickname' },
      gender: {
        label: 'Gender',
        placeholder: 'Choose',
        options: {
          woman: 'Woman',
          man: 'Man',
          nonbinary: 'Non-binary',
          other: 'Other',
          skip: 'Prefer not to say',
        },
      },
      github: { label: 'GitHub', prefix: 'github.com/', placeholder: 'username' },
      email: { label: 'Email', placeholder: 'you@email.com' },
      coding: {
        label: 'Do you code in your day-to-day?',
        hint: "If you do, we need your GitHub. If you don't, your LinkedIn.",
        options: { yes: 'Yes', no: 'No' },
      },
      linkedin: {
        label: 'LinkedIn',
        prefix: 'linkedin.com/in/',
        placeholder: 'username',
      },
      site: {
        label: 'Personal site, blog or portfolio',
        placeholder: 'yoursite.com',
      },
      jobs: {
        label: 'Do you want to hear about job opportunities?',
        options: { yes: 'Yes', no: 'No' },
      },
      role: {
        label: 'What is your current role?',
        placeholder: 'e.g. biochemistry student, research at Anthropic',
      },
      deep: {
        label: 'What non-traditional things were you doing growing up?',
        hint: 'Examples are running a Minecraft server, selling things online at 13, reverse-engineering a game, taking apart electronics, running a Discord community with thousands of people, or teaching yourself to code at 11.',
      },
      hardest: {
        label: "What's the hardest thing you've achieved?",
        hint: 'A place, a scholarship, a number, a rank. The one that cost you the most.',
      },
      favorite: {
        label: "Of everything you've built, which is your favorite?",
        hint: 'A project, a product, anything. Paste a link if there is one.',
      },
      diet: {
        label: 'Are you vegan, veggie, or omnivore?',
        options: { vegan: 'Vegan', veggie: 'Veggie', omnivore: 'Omnivore' },
      },
      allergies: {
        label: 'Any food allergies?',
        hint: "Leave it blank if you don't have any.",
      },
    },
    errors: {
      required: 'This one is required.',
      email: 'Check the email.',
      github: 'Check the GitHub username.',
      linkedin: 'Check the LinkedIn username.',
      site: 'Check the link.',
      dupEmail: 'This email is already on the team.',
      dupGithub: 'This username is already on the team.',
    },
  },
  es: {
    home: 'Ir al inicio',
    kicker: '7 y 8 de noviembre, Santiago',
    back: 'Atrás',
    next: 'Siguiente',
    edit: 'Editar',
    optional: 'opcional',
    progress: { label: 'Progreso', text: (n, total) => `Paso ${n} de ${total}` },
    size: {
      title: '¿Cuántos son?',
      hint: 'Postula solo o con un equipo de hasta 4 personas. No hay equipos de 5.',
      people: (n) => `${n} ${n === 1 ? 'persona' : 'personas'}`,
    },
    member: {
      title: (n, total) => `Persona ${n} de ${total}`,
      hintFirst: 'Empieza con tus datos.',
      hintNext: 'Ahora, la siguiente persona del equipo.',
      fallback: (n) => `Persona ${n}`,
    },
    review: {
      title: 'Revisa tu equipo',
      hint: 'Al inscribir, les enviamos un correo a todos. Les avisamos pronto con los detalles y si quedaron.',
      submit: 'Inscribir equipo',
      sending: 'Enviando…',
      failed: 'No pudimos enviar la inscripción. Intenta de nuevo.',
    },
    done: {
      title: 'Equipo inscrito',
      body: 'Recibimos la postulación del equipo. Los correos de confirmación van en camino. Les avisamos pronto con los detalles y si quedaron.',
      sentTo: 'Correos inscritos',
      home: 'Volver al inicio',
    },
    fields: {
      ref: {
        label: 'Código de referido',
        hint: '¿Dónde te enteraste del evento? Escribe un código o el nombre de una organización.',
        placeholder: 'Ej. UC o Alianza Emprende',
      },
      name: { label: 'Nombre o apodo' },
      gender: {
        label: 'Género',
        placeholder: 'Elige',
        options: {
          woman: 'Mujer',
          man: 'Hombre',
          nonbinary: 'No binario',
          other: 'Otro',
          skip: 'Prefiero no decir',
        },
      },
      github: { label: 'GitHub', prefix: 'github.com/', placeholder: 'usuario' },
      email: { label: 'Email', placeholder: 'tu@correo.com' },
      coding: {
        label: '¿Programas en tu día a día?',
        hint: 'Si programas, necesitamos tu GitHub. Si no, tu LinkedIn.',
        options: { yes: 'Sí', no: 'No' },
      },
      linkedin: {
        label: 'LinkedIn',
        prefix: 'linkedin.com/in/',
        placeholder: 'usuario',
      },
      site: {
        label: 'Página personal, blog o portafolio',
        placeholder: 'tusitio.com',
      },
      jobs: {
        label: '¿Te interesa recibir oportunidades laborales?',
        options: { yes: 'Sí', no: 'No' },
      },
      role: {
        label: '¿Cuál es tu rol actual?',
        placeholder: 'Ej. estudiante de bioquímica, research en Anthropic',
      },
      deep: {
        label: '¿Qué cosas fuera de lo común hacías mientras crecías?',
        hint: 'Por ejemplo: administrar un servidor de Minecraft, vender cosas por internet a los 13 o hacerle ingeniería inversa a un juego.',
      },
      hardest: {
        label: '¿Qué es lo más difícil que has logrado?',
        hint: 'Un lugar, una beca, un número, un ranking. El que más te costó.',
      },
      favorite: {
        label: 'De las cosas que has creado, ¿cuál es tu favorita?',
        hint: 'Un proyecto, un producto, lo que sea. Si hay link, pégalo.',
      },
      diet: {
        label: '¿Eres vegano, vegetariano o comes de todo?',
        options: { vegan: 'Vegano', veggie: 'Vegetariano', omnivore: 'Como de todo' },
      },
      allergies: {
        label: '¿Alguna alergia alimentaria?',
        hint: 'Si no tienes, déjalo en blanco.',
      },
    },
    errors: {
      required: 'Falta este dato.',
      email: 'Revisa el email.',
      github: 'Revisa el usuario de GitHub.',
      linkedin: 'Revisa el usuario de LinkedIn.',
      site: 'Revisa el link.',
      dupEmail: 'Este email ya está en el equipo.',
      dupGithub: 'Este usuario ya está en el equipo.',
    },
  },
}
