import { useState, useEffect, createContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import PairDetail from './pages/PairDetail'

export const AuthContext = createContext()

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        setUser(session.user)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setUser(session.user)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ session, user }}>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/auth" />} />
        <Route path="/pair/:pairId" element={session ? <PairDetail /> : <Navigate to="/auth" />} />
        <Route path="/" element={session ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} />
      </Routes>
    </AuthContext.Provider>
  )
}

export default App
