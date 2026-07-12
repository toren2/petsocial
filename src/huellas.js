// Niveles del sistema de Huellas. Los umbrales viven acá (no en SQL)
// para poder ajustarlos sin migraciones.
export const HUELLAS_LEVELS = [
  { key: 'cachorro',   min: 0,    max: 100,      emoji: '🐶' },
  { key: 'explorador', min: 100,  max: 500,      emoji: '🧭' },
  { key: 'popular',    min: 500,  max: 1000,     emoji: '⭐' },
  { key: 'leyenda',    min: 1000, max: 5000,     emoji: '🏆' },
  { key: 'embajador',  min: 5000, max: Infinity, emoji: '👑' },
]

export function getHuellasLevel(points) {
  const p = points || 0
  return HUELLAS_LEVELS.find(l => p >= l.min && p < l.max) || HUELLAS_LEVELS[HUELLAS_LEVELS.length - 1]
}

// Progreso (0 a 1) dentro del nivel actual. En el último nivel siempre es 1 (no hay techo).
export function getLevelProgress(points) {
  const p = points || 0
  const level = getHuellasLevel(p)
  if (level.max === Infinity) return 1
  return Math.min(1, Math.max(0, (p - level.min) / (level.max - level.min)))
}
