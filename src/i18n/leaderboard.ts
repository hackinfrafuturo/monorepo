import type { Locale } from './locale'

export const leaderboardMessages = {
  en: {
    title: 'Leaderboard',
    description: 'The top ten players in Runner and Breakout. One spot per GitHub username, with your best result.',
    back: '← Back to the landing',
    seeOther: 'En español',
    intro: 'Two games. Ten spots each.',
    best: 'One spot per GitHub username. Your best result counts.',
    rank: 'Rank',
    player: 'Player',
    loading: 'Loading scores…',
    unavailable: 'Scores are temporarily unavailable.',
    empty: 'No scores yet. Take the first spot.',
    refresh: 'Refresh scores',
    refreshing: 'Refreshing…',
    runner: {
      rule: 'Keep the star running. Highest score wins.',
      metric: 'Score',
      play: 'Play Runner ↗',
    },
    breakout: {
      rule: 'Clear the letters. Fastest win takes the lead.',
      metric: 'Time',
      play: 'Play Breakout ↗',
    },
  },
  es: {
    title: 'Mejores marcas',
    description: 'Los diez mejores jugadores de Runner y Breakout. Un puesto por usuario de GitHub, con tu mejor marca.',
    back: '← Volver al inicio',
    seeOther: 'In English',
    intro: 'Dos juegos. Diez puestos por juego.',
    best: 'Un puesto por usuario de GitHub. Cuenta tu mejor marca.',
    rank: 'Puesto',
    player: 'Jugador',
    loading: 'Cargando marcas…',
    unavailable: 'Las marcas no están disponibles por ahora.',
    empty: 'Aún no hay marcas. Toma el primer puesto.',
    refresh: 'Actualizar marcas',
    refreshing: 'Actualizando…',
    runner: {
      rule: 'Mantén la estrella corriendo. Gana el mayor puntaje.',
      metric: 'Puntaje',
      play: 'Jugar Runner ↗',
    },
    breakout: {
      rule: 'Despeja las letras. Gana el menor tiempo.',
      metric: 'Tiempo',
      play: 'Jugar Breakout ↗',
    },
  },
} satisfies Record<Locale, unknown>

export type LeaderboardMessages = (typeof leaderboardMessages)[Locale]
