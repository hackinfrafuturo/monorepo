// Every verified tailnet member can access every registered intranet app.
export const projects = [
  {
    id: 'infra-futuro',
    name: 'Infra Futuro',
    description: 'Hackathon · Santiago · 5–6 diciembre 2026',
    statsPath: '/projects/infra-futuro/stats',
  },
] as const

export type Project = (typeof projects)[number]
