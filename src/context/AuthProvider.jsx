import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, role = 'executor') => {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { role }
      }
    })
    
    if (data?.user && !error) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email,
        role: role
      })
    }
    
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateProfile = async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({ data: metadata })
    if (!error) setUser(data.user)
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  const isReviewer = user?.user_metadata?.role === 'reviewer'

  return (
    <AuthContext.Provider value={{ user, loading, isReviewer, signUp, signIn, signOut, updateProfile, updatePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
