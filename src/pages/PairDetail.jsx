import { useState, useEffect, useContext, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseList from '../components/ExpenseList'
import Balance from '../components/Balance'
import Chat from '../components/Chat'
import { computeBalance } from '../lib/money'

function PairDetail() {
  const { pairId } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)

  const [pair, setPair] = useState(null)
  const [partner, setPartner] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [lastSettlement, setLastSettlement] = useState(null)
  const [activeTab, setActiveTab] = useState('expenses')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmSettle, setConfirmSettle] = useState(false)
  const [settling, setSettling] = useState(false)

  const fetchPairData = useCallback(async () => {
    if (!user || !pairId) return
    try {
      setError('')

      const [pairRes, expensesRes, settlementRes, categoriesRes] = await Promise.all([
        supabase
          .from('pairs')
          .select('*, user_a:user_a_id(id, email, first_name), user_b:user_b_id(id, email, first_name)')
          .eq('id', pairId)
          .single(),
        supabase
          .from('expenses')
          .select('*, category:category_id(name, icon)')
          .eq('pair_id', pairId)
          .order('created_at', { ascending: false }),
        supabase
          .from('settlements')
          .select('*')
          .eq('pair_id', pairId)
          .eq('status', 'settled')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase.from('categories').select('id, name, icon').order('name'),
      ])

      if (pairRes.error) throw pairRes.error
      if (expensesRes.error) throw expensesRes.error
      if (settlementRes.error) throw settlementRes.error
      if (categoriesRes.error) throw categoriesRes.error

      const pairData = pairRes.data
      setPair(pairData)
      const isUserA = pairData.user_a_id === user.id
      setPartner(isUserA ? pairData.user_b : pairData.user_a)
      setExpenses(expensesRes.data || [])
      setLastSettlement(settlementRes.data?.[0] || null)
      setCategories(categoriesRes.data || [])
    } catch (err) {
      console.error(err)
      setError(err.message || 'Could not load this pair.')
    } finally {
      setLoading(false)
    }
  }, [pairId, user])

  useEffect(() => {
    fetchPairData()
  }, [fetchPairData])

  // Live updates: refetch when either partner adds/changes expenses or settles up
  useEffect(() => {
    if (!pairId) return
    const channel = supabase
      .channel(`pair-${pairId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `pair_id=eq.${pairId}` },
        () => fetchPairData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settlements', filter: `pair_id=eq.${pairId}` },
        () => fetchPairData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [pairId, fetchPairData])

  const handleDeleteExpense = async (expenseId) => {
    const { error: delError } = await supabase.from('expenses').delete().eq('id', expenseId)
    if (delError) {
      setError(delError.message)
      return
    }
    fetchPairData()
  }

  const handleSettleUp = async () => {
    setSettling(true)
    try {
      const { error: insErr } = await supabase.from('settlements').insert({
        pair_id: pairId,
        settlement_date: new Date().toISOString().slice(0, 10),
        status: 'settled',
        settled_by_user_id: user.id,
      })
      if (insErr) throw insErr
      setConfirmSettle(false)
      await fetchPairData()
    } catch (err) {
      setError(err.message)
    } finally {
      setSettling(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!pair || !partner) {
    return (
      <div className="container">
        <div className="card">
          <h2>Pair not found</h2>
          <p className="text-muted" style={{ margin: '12px 0' }}>
            {error || "This pair doesn't exist or you don't have access to it."}
          </p>
          <button className="secondary" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const partnerName = partner.first_name || partner.email
  const balance = computeBalance(expenses, user.id, partner.id, lastSettlement?.created_at)
  const unsettledCount = expenses.filter(
    (e) => !lastSettlement || new Date(e.created_at) > new Date(lastSettlement.created_at)
  ).length

  return (
    <div>
      <div className="header">
        <div className="container flex-between">
          <div>
            <h1>You &amp; {partnerName}</h1>
            <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
              Logged in as <strong>{user.email}</strong>
            </div>
          </div>
          <div className="flex">
            <button className="secondary" onClick={() => navigate('/dashboard')}>
              Back
            </button>
            <button className="secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {error && <div className="message error">{error}</div>}

        <Balance
          balance={balance}
          partnerName={partnerName}
          lastSettlement={lastSettlement}
        />

        {balance !== 0 && unsettledCount > 0 && (
          <div className="card" style={{ textAlign: 'center' }}>
            {!confirmSettle ? (
              <button className="primary" onClick={() => setConfirmSettle(true)}>
                Settle up
              </button>
            ) : (
              <div>
                <p style={{ marginBottom: '12px' }}>
                  Mark everything as paid and reset the balance to zero?
                </p>
                <div className="flex" style={{ justifyContent: 'center' }}>
                  <button className="primary" onClick={handleSettleUp} disabled={settling}>
                    {settling ? 'Settling...' : 'Yes, settle up'}
                  </button>
                  <button className="secondary" onClick={() => setConfirmSettle(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="nav">
          <button
            className={`nav-item ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            Expenses
          </button>
          <button
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat
          </button>
        </div>

        {activeTab === 'expenses' && (
          <div>
            <div className="card">
              <h2>Add Expense</h2>
              <ExpenseForm
                pairId={pairId}
                userId={user.id}
                partnerId={partner.id}
                partnerName={partnerName}
                categories={categories}
                onSuccess={fetchPairData}
              />
            </div>

            <div className="card">
              <h2>Expenses</h2>
              {expenses.length === 0 ? (
                <p className="text-muted">No expenses yet. Add one to get started!</p>
              ) : (
                <ExpenseList
                  expenses={expenses}
                  currentUserId={user.id}
                  partnerId={partner.id}
                  partnerName={partnerName}
                  lastSettledAt={lastSettlement?.created_at}
                  onDelete={handleDeleteExpense}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="card">
            <h2>Chat with {partnerName}</h2>
            <Chat pairId={pairId} currentUserId={user.id} partnerName={partnerName} />
          </div>
        )}
      </div>
    </div>
  )
}

export default PairDetail
