function ExpenseList({ expenses, currentUserId }) {
  return (
    <div>
      {expenses.map((expense) => {
        const isUserPaid = expense.payer_id === currentUserId
        const categoryEmojis = {
          Groceries: '🛒',
          Dinner: '🍽️',
          Entertainment: '🎬',
          Transport: '🚗',
          Utilities: '💡',
          Other: '📌',
        }

        return (
          <div key={expense.id} className="expense-item">
            <div className="expense-details">
              <div className="expense-description">
                {expense.description}
              </div>
              <div className="expense-meta">
                {isUserPaid && <span className="badge badge-primary">You paid</span>}
                {!isUserPaid && <span className="badge">Partner paid</span>}
                {expense.is_gift && <span className="badge badge-primary" style={{ marginLeft: '8px' }}>Gift</span>}
                <span style={{ marginLeft: '8px' }}>
                  {new Date(expense.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="expense-amount" style={{ color: isUserPaid ? 'var(--primary)' : 'var(--gray-600)' }}>
              {isUserPaid ? '+' : '-'}£{parseFloat(expense.amount).toFixed(2)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ExpenseList
