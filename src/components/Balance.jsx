function Balance({ balance, partnerName }) {
  const isPositive = balance >= 0
  const absBalance = Math.abs(balance).toFixed(2)

  let message = ''
  if (balance === 0) {
    message = "You're all settled up!"
  } else if (isPositive) {
    message = `${partnerName} owes you £${absBalance}`
  } else {
    message = `You owe ${partnerName} £${absBalance}`
  }

  return (
    <div className={`balance ${isPositive ? 'positive' : 'negative'}`}>
      {message}
    </div>
  )
}

export default Balance
