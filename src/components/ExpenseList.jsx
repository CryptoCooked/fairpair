import { useState } from 'react'
import { formatMoney, netEffect } from '../lib/money'

function ExpenseList({ expenses, currentUserId, partnerId, partnerName, lastSettledAt, onDelete }) {
  const [pendingDelete, setPendingDelete] = useState(null)
  const cutoff = lastSettledAt ? new Date(lastSettledAt).getTime() : 0

  return (
    <div>
      {expenses.map((expense) => {
        const iPaid = expense.payer_id === currentUserId
        const iCreated = expense.created_by_id === currentUserId
        const settled = cutoff && new Date(expense.created_at).getTime() <= cutoff
        const net = netEffect(expense, currentUserId, partnerId)

        let netLabel = ''
        let netClass = 'text-muted'
        if (expense.is_gift) {
          netLabel = 'Gift'
        } else if (settled) {
          netLabel = 'Settled'
        } else if (net > 0) {
          netLabel = `${partnerName} owes you ${formatMoney(net)}`
          netClass = 'text-success'
        } else if (net < 0) {
          netLabel = `You owe ${formatMoney(-net)}`
          netClass = 'text-danger'
        } else {
          netLabel = 'Even'
        }

        return (
          <div key={expense.id} className="expense-item" style={{ opacity: settled ? 0.6 : 1 }}>
            <div className="expense-details">
              <div className="expense-description">
                {expense.category?.icon ? `${expense.category.icon} ` : ''}
                {expense.description}
              </div>
              <div className="expense-meta">
                <span className={`badge ${iPaid ? 'badge-primary' : ''}`}>
                  {iPaid ? 'You paid' : `${partnerName} paid`}
                </span>
                {expense.is_gift && (
                  <span className="badge badge-primary" style={{ marginLeft: '8px' }}>
                    Gift
                  </span>
                )}
                {expense.split_type !== '50-50' && !expense.is_gift && (
                  <span className="badge" style={{ marginLeft: '8px' }}>
                    {expense.split_type === 'custom' ? 'Custom split' : 'Exact split'}
                  </span>
                )}
                <span style={{ marginLeft: '8px' }}>
                  {new Date(expense.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className={netClass} style={{ fontSize: '13px', marginTop: '4px' }}>
                {netLabel}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div className="expense-amount">{formatMoney(expense.amount)}</div>
              {iCreated && onDelete && (
                pendingDelete === expense.id ? (
                  <div className="flex" style={{ gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                    <button
                      className="secondary btn-sm"
                      onClick={() => {
                        onDelete(expense.id)
                        setPendingDelete(null)
                      }}
                    >
                      Delete
                    </button>
                    <button className="secondary btn-sm" onClick={() => setPendingDelete(null)}>
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    className="link-btn"
                    onClick={() => setPendingDelete(expense.id)}
                    style={{ marginTop: '4px' }}
                  >
                    Remove
                  </button>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ExpenseList
