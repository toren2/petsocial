import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  // Soporte de mascotas multiples (Fase 1): cada cuenta puede tener mas de
  // una mascota en `pets`. `activePetId` decide con cual se ven/editan los
  // registros personales (vacunas, historial medico, fotos). Se persiste en
  // localStorage (para no saltar al recargar) y en profiles.active_pet_id.
  const [pets, setPets] = useState([])
  const [activePetId, setActivePetId] = useState(null)
  const [petsLoading, setPetsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })

    // Cuando alguien confirma su correo (o hace login) desde el navegador
    // del celular en vez de dentro de la app instalada, la sesion queda
    // guardada en el mismo storage (la TWA comparte el motor de Chrome con
    // el navegador), pero la app que quedo abierta de fondo no se entera
    // sola. Por eso, cada vez que la app vuelve a primer plano, volvemos a
    // pedirle la sesion a Supabase para reflejar el login sin que la
    // persona tenga que cerrar y volver a abrir la app.
    function handleForeground() {
      if (document.visibilityState !== 'visible') return
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
    }
    document.addEventListener('visibilitychange', handleForeground)
    window.addEventListener('focus', handleForeground)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleForeground)
      window.removeEventListener('focus', handleForeground)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setPets([])
      setActivePetId(null)
      setPetsLoading(false)
      return
    }
    fetchPets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function fetchPets() {
    setPetsLoading(true)
    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.id)
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: true })

    if (data) {
      setPets(data)
      const stored = localStorage.getItem('activePetId')
      let resolved = data.find(p => p.id === stored)?.id

      if (!resolved) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('active_pet_id')
          .eq('id', user.id)
          .maybeSingle()
        resolved = data.find(p => p.id === prof?.active_pet_id)?.id
      }

      if (!resolved) resolved = data.find(p => p.is_primary)?.id || data[0]?.id || null

      setActivePetId(resolved)
      if (resolved) localStorage.setItem('activePetId', resolved)
    }
    setPetsLoading(false)
  }

  async function switchPet(id) {
    setActivePetId(id)
    localStorage.setItem('activePetId', id)
    await supabase.from('profiles').update({ active_pet_id: id }).eq('id', user.id)
  }

  async function addPet(petData) {
    const { data, error } = await supabase
      .from('pets')
      .insert([{ owner_id: user.id, is_primary: false, order_index: pets.length, ...petData }])
      .select()
      .single()
    if (!error && data) {
      setPets(prev => [...prev, data])
      await switchPet(data.id)
    }
    return { data, error }
  }

  const activePet = pets.find(p => p.id === activePetId) || null

  async function signUp(email, password, birthdate) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { birthdate } },
    })
    return { data, error }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Confirmacion de registro por codigo de 6 digitos: el link del correo se
  // puede "gastar" solo si algo lo pre-visita antes que la persona (Gmail,
  // filtros de seguridad, etc.), dejando la cuenta atascada como no
  // confirmada. El codigo escrito a mano no tiene ese problema, asi que es
  // la via principal; el link del correo sigue funcionando como respaldo.
  async function verifySignupOtp(email, token) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    return { data, error }
  }

  async function resendSignupConfirmation(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return { error }
  }

  async function resetPasswordForEmail(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error }
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  function clearPasswordRecovery() {
    setIsPasswordRecovery(false)
  }

  return (
    <AuthContext.Provider value={{
      user, loading, signUp, signIn, signOut,
      verifySignupOtp, resendSignupConfirmation,
      isPasswordRecovery, resetPasswordForEmail, updatePassword, clearPasswordRecovery,
      pets, activePet, activePetId, petsLoading, switchPet, addPet, refetchPets: fetchPets,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}