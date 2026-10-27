import type { Locale } from './locale'

export const leaderboardMessages = {
  en: {
    title: 'Leaderboard',
    description: 'The top ten players in Runner and Breakout. One spot per GitHub username, with your best result.',
    back: '← Back to the landing',
    seeOther: 'En español',
    rank: 'Rank',
    player: 'Player',
    loading: 'Loading scores…',
    unavailable: 'Scores are temporarily unavailable.',
    empty: 'No scores yet. Take the first spot.',
    refresh: 'Refresh scores',
    refreshing: 'Refreshing…',
    runner: {
      metric: 'Score',
      play: 'Play Runner ↗',
    },
    breakout: {
      metric: 'Time',
      play: 'Play Breakout ↗',
    },
  },
  es: {
    title: 'Leaderboard',
    description: 'Los diez mejores jugadores de Runner y Breakout. Un puesto por usuario de GitHub, con tu mejor marca.',
    back: '← Volver al inicio',
    seeOther: 'In English',
    rank: 'Puesto',
    player: 'Jugador',
    loading: 'Cargando marcas…',
    unavailable: 'Las marcas no están disponibles por ahora.',
    empty: 'Aún no hay marcas. Toma el primer puesto.',
    refresh: 'Actualizar marcas',
    refreshing: 'Actualizando…',
    runner: {
      metric: 'Puntaje',
      play: 'Jugar Runner ↗',
    },
    breakout: {
      metric: 'Tiempo',
      play: 'Jugar Breakout ↗',
    },
  },
} satisfies Record<Locale, unknown>

export type LeaderboardMessages = (typeof leaderboardMessages)[Locale]
