// Single place for currency and balance rules.
// Change CURRENCY_SYMBOL here if you want £ or $ instead of R.
export const CURRENCY_SYMBOL = 'R'

export function formatMoney(value) {
  const n = Number(value) || 0
  const abs = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${n < 0 ? '-' : ''}${CURRENCY_SYMBOL}${abs}`
}

export function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

/**
 * How much of an expense is `userId`'s share.
 * - gift: nobody owes anything
 * - 50-50: half
 * - custom / exact: read from splits {userId: amount}; if only the other
 *   person's share was stored, derive ours as amount - theirs.
 */
export function shareFor(expense, userId, partnerId) {
  const amount = Number(expense.amount) || 0
  if (expense.is_gift) return 0
  const splits = expense.splits || {}
  if (expense.split_type === '50-50') return round2(amount / 2)
  if (splits[userId] !== undefined && splits[userId] !== null) {
    return round2(splits[userId])
  }
  if (partnerId && splits[partnerId] !== undefined && splits[partnerId] !== null) {
    return round2(amount - Number(splits[partnerId]))
  }
  return round2(amount / 2)
}

/**
 * Net effect of one expense on `userId`'s balance.
 * Positive = partner owes user, negative = user owes partner.
 */
export function netEffect(expense, userId, partnerId) {
  if (expense.is_gift) return 0
  const amount = Number(expense.amount) || 0
  const myShare = shareFor(expense, userId, partnerId)
  if (expense.payer_id === userId) return round2(amount - myShare)
  return round2(-myShare)
}

/**
 * Overall balance for `userId`, counting only expenses created after the
 * most recent settlement (if any).
 */
export function computeBalance(expenses, userId, partnerId, lastSettledAt) {
  const cutoff = lastSettledAt ? new Date(lastSettledAt).getTime() : 0
  let total = 0
  for (const e of expenses) {
    if (cutoff && new Date(e.created_at).getTime() <= cutoff) continue
    total += netEffect(e, userId, partnerId)
  }
  return round2(total)
}
