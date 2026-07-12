// Determina si una fecha de nacimiento corresponde a alguien de 18 años o más.
export function isAdult(birthdateStr) {
  if (!birthdateStr) return false
  const birth = new Date(`${birthdateStr}T00:00:00`)
  if (isNaN(birth.getTime())) return false
  const today = new Date()
  const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  return birth <= cutoff
}

// Atajo para leer la fecha de nacimiento desde el objeto user de Supabase Auth
// (se guarda en user_metadata al registrarse) y saber si es menor de edad.
export function isMinorUser(user) {
  const birthdate = user?.user_metadata?.birthdate
  if (!birthdate) return false
  return !isAdult(birthdate)
}
