import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'

function Dashboard() {
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [pairs, setPairs] = useState([])
  const [loading, setLoading] = useState(true)
  const [partnerEmail, setPartnerEmail] = useState('')
  const [showCreatePair, setShowCreatePair] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPairs()
  }, [user])

  const fetchPairs = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('pairs')
        .select(
          `
          *,
          user_a:user_a_id(email, first_name),
          user_b:user_b_id(email, first_name)
        `
        )
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)

      if (error) throw error
      setPairs(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePair = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (partnerEmail.trim().toLowerCase() === (user.email || '').toLowerCase()) {
        throw new Error("That's your own email. Enter your partner's email address.")
      }

      // Look up partner via secure RPC (works before a pair exists)
      const { data: partnerRows, error: partnerError } = await supabase.rpc(
        'find_profile_by_email',
        { p_email: partnerEmail }
      )

      if (partnerError) throw partnerError
      const partnerData = partnerRows?.[0]
      if (!partnerData) {
        throw new Error(
          'No FairPair account found with that email. Ask your partner to sign up first.'
        )
      }

      // Create pair
      const { error: pairError } = await supabase.from('pairs').insert({
        user_a_id: user.id,
        user_b_id: partnerData.id,
      })

      if (pairError) {
        if (pairError.code === '23505') {
          throw new Error('You are already paired with this person.')
        }
        throw pairError
      }

      setPartnerEmail('')
      setShowCreatePair(false)
      fetchPairs()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  return (
    <div>
      <div className="header">
        <div className="container flex-between">
          <h1>FairPair</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
              Logged in as: <strong>{user?.email}</strong>
            </span>
            <button className="secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="message error">{error}</div>}

        {pairs.length === 0 ? (
          <div className="card text-center">
            <h2>Welcome to FairPair!</h2>
            <p style={{ marginTop: '12px', marginBottom: '24px' }}>
              Create a pair with your partner to start tracking shared expenses.
            </p>
            <button className="primary" onClick={() => setShowCreatePair(true)}>
              Create First Pair
            </button>
          </div>
        ) : (
          <div>
            <div className="flex-between" style={{ marginBottom: '24px' }}>
              <h2>Your Pairs</h2>
              <button className="primary" onClick={() => setShowCreatePair(true)}>
                + New Pair
              </button>
            </div>

            <div className="grid">
              {pairs.map((pair) => {
                const isUserA = pair.user_a_id === user.id
                const partner = isUserA ? pair.user_b : pair.user_a

                return (
                  <div
                    key={pair.id}
                    className="card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/pair/${pair.id}`)}
                  >
                    <h3>You & {partner.first_name || partner.email}</h3>
                    <p className="text-muted" style={{ fontSize: '12px', marginTop: '8px' }}>
                      Created {new Date(pair.created_at).toLocaleDateString()}
                    </p>
                    <div style={{ marginTop: '16px' }}>
                      <button className="primary" style={{ width: '100%' }}>
                        View Details
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {showCreatePair && (
          <div className="card" style={{ marginTop: '24px' }}>
            <h2>Create New Pair</h2>
            <form onSubmit={handleCreatePair} style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label>Partner's Email</label>
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@example.com"
                  required
                />
              </div>
              <div className="flex">
                <button type="submit" className="primary">
                  Create Pair
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowCreatePair(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
