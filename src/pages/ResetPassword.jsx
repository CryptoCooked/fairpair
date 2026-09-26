import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// Landing page for the link in Supabase's "reset password" email.
// Supabase puts a recovery session in place when the link is opened,
// so all we need is to ask for the new password and call updateUser.
function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setReady(!!session)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true)
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      setDone(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="card">
        <h1 style={{ textAlign: 'center', marginBottom: '8px' }}>FairPair</h1>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--gray-600)' }}>
          Choose a new password
        </p>

        {error && <div className="message error">{error}</div>}
        {done && <div className="message success">Password updated. Taking you to your dashboard…</div>}

        {!ready && !done ? (
          <div>
            <p className="text-muted" style={{ marginBottom: '16px' }}>
              This link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link to="/auth">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>New password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="primary" style={{ width: '100%' }} disabled={loading || done}>
              {loading ? 'Saving...' : 'Save new password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
