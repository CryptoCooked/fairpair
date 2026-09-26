import { useState, useEffect, useContext } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'
import ExpenseForm from '../components/ExpenseForm'
import ExpenseList from '../components/ExpenseList'
import Balance from '../components/Balance'
import Chat from '../components/Chat'

function PairDetail() {
  const { pairId } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(AuthContext)
  const [pair, setPair] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [partner, setPartner] = useState(null)
  const [balance, setBalance] = useState(0)
  const [activeTab, setActiveTab] = useState('expenses')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPairData()
    const subscription = supabase
      .from('expenses')
      .on('*', (payload) => {
        fetchPairData()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [pairId, user])

  const fetchPairData = async () => {
    try {
      // Fetch pair
      const { data: pairData, error: pairError } = await supabase
        .from('pairs')
        .select('*, user_a:user_a_id(email, first_name), user_b:user_b_id(email, first_name)')
        .eq('id', pairId)
        .single()

      if (pairError) throw pairError
      setPair(pairData)

      // Set partner
      const isUserA = pairData.user_a_id === user.id
      setPartner(isUserA ? pairData.user_b : pairData.user_a)

      // Fetch expenses
      const { data: expenseData, error: expenseError } = await supabase
        .from('expenses')
        .select('*')
        .eq('pair_id', pairId)
        .order('created_at', { ascending: false })

      if (expenseError) throw expenseError
      setExpenses(expenseData || [])

      // Calculate balance
      calculateBalance(pairData, expenseData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const calculateBalance = (pairData, expenseList) => {
    let totalUserPaid = 0
    let totalUserOwes = 0

    expenseList.forEach((expense) => {
      if (expense.payer_id === user.id) {
        totalUserPaid += parseFloat(expense.amount)
      }

      if (expense.split_type === '50-50' && !expense.is_gift) {
        totalUserOwes += parseFloat(expense.amount) / 2
      } else if (expense.split_type === 'custom' && expense.splits[user.id]) {
        totalUserOwes += parseFloat(expense.splits[user.id])
      } else if (expense.split_type === 'exact' && expense.splits[user.id]) {
        totalUserOwes += parseFloat(expense.splits[user.id])
      }
    })

    const balance = totalUserPaid - totalUserOwes
    setBalance(balance)
  }

  if (loading) {
    return <div className="container">Loading...</div>
  }

  if (!pair || !partner) {
    return <div className="container">Pair not found</div>
  }

  return (
    <div>
      <div className="header">
        <div className="container flex-between">
          <h1>You & {partner.first_name || partner.email}</h1>
          <button className="secondary" onClick={() => navigate('/dashboard')}>
            Back
          </button>
        </div>
      </div>

      <div className="container">
        <Balance balance={balance} partnerName={partner.first_name || partner.email} />

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
              <ExpenseForm pairId={pairId} onSuccess={fetchPairData} />
            </div>

            <div className="card">
              <h2>Recent Expenses</h2>
              {expenses.length === 0 ? (
                <p className="text-muted">No expenses yet. Add one to get started!</p>
              ) : (
                <ExpenseList expenses={expenses} currentUserId={user.id} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="card">
            <h2>Chat with {partner.first_name || partner.email}</h2>
            <Chat pairId={pairId} currentUserId={user.id} partnerName={partner.first_name} />
          </div>
        )}
      </div>
    </div>
  )
}

export default PairDetail
