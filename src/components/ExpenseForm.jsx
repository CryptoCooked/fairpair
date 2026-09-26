import { useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { formatMoney, round2, CURRENCY_SYMBOL } from '../lib/money'

function ExpenseForm({ pairId, userId, partnerId, partnerName, categories, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [payerId, setPayerId] = useState(userId)
  const [splitType, setSplitType] = useState('50-50')
  const [myPercent, setMyPercent] = useState('50')
  const [myExact, setMyExact] = useState('')
  const [isGift, setIsGift] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const amountNum = Number(amount) || 0

  // Work out each person's share for the preview and for saving
  const shares = useMemo(() => {
    if (isGift || !amountNum) return null
    let mine
    if (splitType === '50-50') mine = amountNum / 2
    else if (splitType === 'custom') mine = (amountNum * (Number(myPercent) || 0)) / 100
    else mine = Number(myExact) || 0
    mine = round2(Math.min(Math.max(mine, 0), amountNum))
    return { mine, partner: round2(amountNum - mine) }
  }, [amountNum, splitType, myPercent, myExact, isGift])

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setCategoryId('')
    setPayerId(userId)
    setSplitType('50-50')
    setMyPercent('50')
    setMyExact('')
    setIsGift(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!amountNum || amountNum <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!isGift && splitType === 'custom') {
      const p = Number(myPercent)
      if (Number.isNaN(p) || p < 0 || p > 100) {
        setError('Your share must be between 0% and 100%.')
        return
      }
    }
    if (!isGift && splitType === 'exact') {
      const x = Number(myExact)
      if (Number.isNaN(x) || x < 0 || x > amountNum) {
        setError(`Your share must be between ${formatMoney(0)} and ${formatMoney(amountNum)}.`)
        return
      }
    }

    setLoading(true)
    try {
      const splits =
        !isGift && splitType !== '50-50' && shares
          ? { [userId]: shares.mine, [partnerId]: shares.partner }
          : {}

      const { error: insertError } = await supabase.from('expenses').insert({
        pair_id: pairId,
        payer_id: payerId,
        created_by_id: userId,
        amount: round2(amountNum),
        description: description.trim(),
        category_id: categoryId || null,
        split_type: isGift ? 'exact' : splitType,
        is_gift: isGift,
        splits,
      })

      if (insertError) throw insertError

      resetForm()
      onSuccess?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="message error">{error}</div>}

      <div className="grid" style={{ gap: '12px' }}>
        <div className="form-group">
          <label>Amount ({CURRENCY_SYMBOL})</label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
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
            placeholder="What was it for?"
            maxLength={120}
            required
          />
        </div>
      </div>

      <div className="grid" style={{ gap: '12px' }}>
        <div className="form-group">
          <label>Category</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon ? `${cat.icon} ` : ''}{cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Who paid?</label>
          <select value={payerId} onChange={(e) => setPayerId(e.target.value)}>
            <option value={userId}>Me</option>
            <option value={partnerId}>{partnerName}</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isGift}
            onChange={(e) => setIsGift(e.target.checked)}
            style={{ width: 'auto' }}
          />
          This is a gift (no reimbursement expected)
        </label>
      </div>

      {!isGift && (
        <div className="grid" style={{ gap: '12px' }}>
          <div className="form-group">
            <label>How to split</label>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value)}>
              <option value="50-50">50 / 50</option>
              <option value="custom">By percentage</option>
              <option value="exact">Exact amounts</option>
            </select>
          </div>

          {splitType === 'custom' && (
            <div className="form-group">
              <label>Your share (%)</label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="1"
                value={myPercent}
                onChange={(e) => setMyPercent(e.target.value)}
                required
              />
            </div>
          )}

          {splitType === 'exact' && (
            <div className="form-group">
              <label>Your share ({CURRENCY_SYMBOL})</label>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={myExact}
                onChange={(e) => setMyExact(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
          )}
        </div>
      )}

      {shares && (
        <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
          Your share {formatMoney(shares.mine)} · {partnerName}&apos;s share{' '}
          {formatMoney(shares.partner)}
        </p>
      )}
      {isGift && amountNum > 0 && (
        <p className="text-muted" style={{ fontSize: '13px', marginBottom: '12px' }}>
          Recorded as a gift — it won&apos;t change the balance.
        </p>
      )}

      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add Expense'}
      </button>
    </form>
  )
}

export default ExpenseForm
