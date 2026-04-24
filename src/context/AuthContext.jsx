import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async (sessionUser) => {
      if (!sessionUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle()

        const allViews = ['/agents', '/contacts', '/pipeline', '/tasks', '/calendar', '/followups', '/finance', '/invoices/new', '/plans', '/converter', '/resources', '/security']
        
        if (error || !profile) {
          // If profile doesn't exist, provide default permissions
          setUser({
            ...sessionUser,
            allowed_views: sessionUser.email === 'apoc@apocautomation.site' ? allViews : allViews.filter(v => v !== '/users')
          })
        } else {
          // Update last login
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', sessionUser.id)

          // Ensure main account always has all views
          const userProfile = { ...sessionUser, ...profile }
          if (sessionUser.email === 'apoc@apocautomation.site') {
            userProfile.allowed_views = allViews
          } else if (!userProfile.allowed_views) {
            userProfile.allowed_views = allViews.filter(v => v !== '/users')
          }
          setUser(userProfile)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setUser(sessionUser)
      } finally {
        setLoading(false)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchProfile(session?.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      fetchProfile(session?.user)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
