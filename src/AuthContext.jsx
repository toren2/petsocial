import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true)
    })

    return () => subscription.unsubscribe()
  }, [])

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
      isPasswordRecovery, resetPasswordForEmail, updatePassword, clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}