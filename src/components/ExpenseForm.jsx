import { useState, useContext } from 'react'
import { supabase } from '../supabaseClient'
import { AuthContext } from '../App'

const CATEGORIES = [
  { id: 'groceries', name: 'Groceries', icon: '🛒' },
  { id: 'dinner', name: 'Dinner', icon: '🍽️' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
  { id: 'transport', name: 'Transport', icon: '🚗' },
  { id: 'utilities', name: 'Utilities', icon: '💡' },
  { id: 'other', name: 'Other', icon: '📌' },
]

function ExpenseForm({ pairId, onSuccess }) {
  const { user } = useContext(AuthContext)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('other')
  const [splitType, setSplitType] = useState('50-50')
  const [isGift, setIsGift] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: categoryData } = await supabase
        .from('categories')
        .select('id')
        .eq('name', CATEGORIES.find((c) => c.id === category)?.name)
        .single()

      const expenseData = {
        pair_id: pairId,
        payer_id: user.id,
        created_by_id: user.id,
        amount: parseFloat(amount),
        description,
        category_id: categoryData?.id,
        split_type: isGift ? 'exact' : splitType,
        is_gift: isGift,
        splits: {},
      }

      const { error: insertError } = await supabase
        .from('expenses')
        .insert([expenseData])

      if (insertError) throw insertError

      setAmount('')
      setDescription('')
      setCategory('other')
      setSplitType('50-50')
      setIsGift(false)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="message error">{error}</div>}

      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you buy?"
          required
        />
      </div>

      <div className="form-group">
        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
          />
          {' '}Mark as gift (I'm not expecting reimbursement)
        </label>
      </div>

      {!isGift && (
        <div className="form-group">
          <label>Split Type</label>
          <select value={splitType} onChange={(e) => setSplitType(e.target.value)}>
            <option value="50-50">50/50 Split</option>
            <option value="custom">Custom Split</option>
            <option value="exact">Exact Amounts</option>
          </select>
        </div>
      )}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  )
}

export default ExpenseForm
