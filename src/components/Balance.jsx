import { formatMoney } from '../lib/money'

function Balance({ balance, partnerName, lastSettlement }) {
  const isPositive = balance >= 0

  let message
  if (balance === 0) {
    message = "You're all settled up!"
  } else if (isPositive) {
    message = `${partnerName} owes you ${formatMoney(balance)}`
  } else {
    message = `You owe ${partnerName} ${formatMoney(-balance)}`
  }

  return (
    <div>
      <div className={`balance ${isPositive ? 'positive' : 'negative'}`} style={{ marginBottom: '8px' }}>
        {message}
      </div>
      {lastSettlement && (
        <p className="text-muted text-center" style={{ fontSize: '13px', marginBottom: '16px' }}>
          Last settled on {new Date(lastSettlement.created_at).toLocaleDateString()}
        </p>
      )}
    </div>
  )
}

export default Balance
