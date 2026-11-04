import { ConvexError, v } from 'convex/values'
import { internalMutation } from './_generated/server'
import type { Status } from './admin/status'
import { rutCheckDigit } from '../src/apply/model'

/**
 * Made-up applications for a development deployment, so the backoffice has something realistic to show.
 * Only runs where ALLOW_SEED=true is set on the deployment (never set it in production):
 *
 *   npx convex env set ALLOW_SEED true
 *   npx convex run seed:run '{"count": 40}'
 *   npx convex run seed:clear
 *
 * Seeded rows carry ref "seed", use example.com addresses, and skip the confirmation emails.
 */
const REF = 'seed'

const FIRST = ['Camila', 'Matías', 'Valentina', 'Benjamín', 'Antonia', 'Vicente', 'Josefa', 'Tomás', 'Isidora', 'Agustín', 'Florencia', 'Martín', 'Catalina', 'Joaquín', 'Trinidad', 'Diego']
const LAST = ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda', 'Morales', 'Rodríguez', 'López', 'Fuentes', 'Hernández', 'Torres']
const ROLES = ['Estudiante de ingeniería civil en computación', 'Backend engineer en una fintech', 'Investigadora en visión por computador', 'Fundador de una startup de logística', 'Estudiante de bioquímica', 'SRE en un banco', 'Diseñadora de producto', 'Estudiante de secundaria']
const DEEP = [
  'Administraba un servidor de Minecraft con más de cien jugadores y aprendí Linux para que no se cayera.',
  'Vendía fundas de celular por internet a los trece y armé mi propia tienda con un script en PHP.',
  'Le hacía ingeniería inversa a juegos de GameBoy para traducirlos al español con mis amigos.',
  'Armé una radio pirata en el colegio con un transmisor que soldé siguiendo un foro ruso.',
]
const HARDEST = [
  'Quedar en la final mundial de la ICPC con un equipo que armamos en la universidad.',
  'Ganarme una beca completa para estudiar afuera trabajando de noche para pagar el inglés.',
  'Llevar nuestro producto a diez mil usuarios activos sin gastar un peso en marketing.',
  'Publicar mi primer paper como autora principal mientras terminaba la carrera.',
]
const FAVORITE = [
  'Un compilador pequeño para un lenguaje de juguete que corre en el navegador: github.com/ejemplo/toy.',
  'Una app que avisa cuándo pasa la micro usando datos abiertos de transporte público.',
  'Un robot que riega las plantas de mi abuela y le manda fotos por WhatsApp.',
  'Un bot de Discord que corrige ejercicios de programación para mi curso.',
]
const SIZES = [1, 1, 1, 2, 2, 3, 3, 4]
const STATUS_MIX: Status[] = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'accepted', 'accepted', 'waitlisted', 'rejected']

export const run = internalMutation({
  args: { count: v.optional(v.number()) },
  returns: v.number(),
  handler: async (ctx, { count = 40 }) => {
    if (process.env.ALLOW_SEED !== 'true') throw new ConvexError('Seeding is off on this deployment (ALLOW_SEED)')
    if (await ctx.db.query('applications').withIndex('by_ref', (q) => q.eq('ref', REF)).first())
      throw new ConvexError('Already seeded: run seed:clear first')
    // a fixed sequence, so every seeded deployment looks the same
    let state = 7
    const next = () => (state = (state * 48271) % 2147483647)
    const pick = <T>(list: readonly T[]) => list[next() % list.length]
    const now = Date.now()
    let person = 0
    for (let i = 0; i < Math.min(Math.max(1, Math.floor(count)), 200); i++) {
      const size = pick(SIZES)
      const status = pick(STATUS_MIX)
      const submittedAt = now - (next() % (30 * 24 * 60)) * 60_000
      const applicationId = await ctx.db.insert('applications', {
        submittedAt,
        size,
        ref: REF,
        ...(status === 'pending' ? {} : { status, decidedAt: submittedAt + 86_400_000, decidedBy: 'seed' }),
      })
      for (let m = 0; m < size; m++) {
        person++
        const coding = next() % 5 === 0 ? 'no' : 'yes'
        await ctx.db.insert('members', {
          applicationId,
          name: `${pick(FIRST)} ${pick(LAST)}`,
          gender: pick(['woman', 'man', 'woman', 'man', 'nonbinary', 'skip'] as const),
          github: coding === 'yes' ? `seed-user-${person}` : '',
          email: `seed+${person}@example.com`,
          coding,
          linkedin: coding === 'no' ? `seed-user-${person}` : '',
          site: next() % 3 === 0 ? `seed-user-${person}.example.com` : '',
          jobs: next() % 2 === 0 ? 'yes' : 'no',
          role: pick(ROLES),
          deep: pick(DEEP),
          hardest: pick(HARDEST),
          favorite: pick(FAVORITE),
          diet: pick(['omnivore', 'omnivore', 'omnivore', 'veggie', 'vegan'] as const),
          allergies: next() % 6 === 0 ? 'Maní' : '',
          idType: 'rut',
          idNumber: `${10_000_000 + person}-${rutCheckDigit(String(10_000_000 + person))}`,
          parking: next() % 4 === 0 ? 'yes' : 'no',
        })
      }
    }
    return person
  },
})

/** removes every seeded application, its members, and their audit entries */
export const clear = internalMutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    if (process.env.ALLOW_SEED !== 'true') throw new ConvexError('Seeding is off on this deployment (ALLOW_SEED)')
    const applications = await ctx.db.query('applications').withIndex('by_ref', (q) => q.eq('ref', REF)).take(200)
    for (const application of applications) {
      const members = await ctx.db.query('members').withIndex('by_application', (q) => q.eq('applicationId', application._id)).take(8)
      for (const member of members) {
        const links = await ctx.db.query('editLinks').withIndex('by_member', (q) => q.eq('memberId', member._id)).take(10)
        for (const link of links) await ctx.db.delete(link._id)
        await ctx.db.delete(member._id)
      }
      const entries = await ctx.db.query('auditLog').withIndex('by_application', (q) => q.eq('applicationId', application._id)).take(100)
      for (const entry of entries) await ctx.db.delete(entry._id)
      const reviews = await ctx.db.query('reviews').withIndex('by_application', (q) => q.eq('applicationId', application._id)).take(50)
      for (const review of reviews) await ctx.db.delete(review._id)
      const emails = await ctx.db.query('decisionEmails').withIndex('by_application', (q) => q.eq('applicationId', application._id)).take(50)
      for (const email of emails) await ctx.db.delete(email._id)
      const sent = await ctx.db.query('messageRecipients').withIndex('by_application', (q) => q.eq('applicationId', application._id)).take(50)
      for (const row of sent) await ctx.db.delete(row._id)
      await ctx.db.delete(application._id)
    }
    return applications.length
  },
})
