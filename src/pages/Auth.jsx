import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'

function Auth() {
  const navigate = useNavigate()
  const { session } = useContext(AuthContext)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect to dashboard once App's auth listener has a session
  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true })
    }
  }, [session, navigate])

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up — first_name goes in metadata so the DB trigger saves it
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() } },
        })

        if (signUpError) throw signUpError

        if (data.session) {
          // Email confirmation is off: user is signed in immediately.
          // The auth listener will redirect to the dashboard.
          return
        }

        setInfo(
          'Account created! Check your email for a confirmation link, then sign in.'
        )
        setIsSignUp(false)
        setPassword('')
        setFirstName('')
      } else {
        // Sign in — the auth listener in App.jsx picks up the session and redirects
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (signInError) throw signInError

        if (!data?.session) {
          throw new Error('Login succeeded but no session was created. Please try again.')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>
          FairPair
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--gray-600)' }}>
          Split fairly. Stay close.
        </p>

        {error && <div className="message error">{error}</div>}
        {info && <div className="message success">{info}</div>}

        <form onSubmit={handleAuth}>
          {isSignUp && (
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setInfo('')
            }}
            style={{
              background: 'none',
              color: 'var(--primary)',
              padding: 0,
              fontSize: 'inherit',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth
