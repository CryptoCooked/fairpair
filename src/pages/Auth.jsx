import { useState, useContext, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'

function Auth() {
  const navigate = useNavigate()
  const { session } = useContext(AuthContext)

  // Redirect to dashboard if session exists
  useEffect(() => {
    if (session) {
      console.log('Session detected, redirecting to dashboard')
      navigate('/dashboard')
    }
  }, [session, navigate])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        // Sign up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })

        if (signUpError) throw signUpError

        // Update profile with first name (profile auto-created by trigger)
        if (data.user && firstName) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ first_name: firstName })
            .eq('id', data.user.id)

          if (profileError) throw profileError
        }

        setError('Account created! Please sign in with your credentials.')
        setIsSignUp(false)
        setEmail('')
        setPassword('')
        setFirstName('')
      } else {
        // Sign in
        console.log('Attempting login with:', email)
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('Login response:', { data, signInError })

        if (signInError) {
          console.error('Sign in error:', signInError)
          throw signInError
        }

        if (!data?.session) {
          throw new Error('Login succeeded but no session was created. Please try again.')
        }

        console.log('✓ Session established, auth listener will redirect to dashboard')
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
