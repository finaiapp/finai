// Keep in sync with server/utils/validation.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

// Keep in sync with server/utils/validation.ts
export function validateTransactionForm(data: { type: string; amount: string; description: string; date: string }): { field: string; message: string }[] {
  const errors: { field: string; message: string }[] = []

  if (!data.type || !['income', 'expense'].includes(data.type)) {
    errors.push({ field: 'type', message: 'Type must be "income" or "expense"' })
  }

  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    errors.push({ field: 'amount', message: 'Amount must be a positive number' })
  }
  else if (parseFloat(data.amount) > 9999999999.99) {
    errors.push({ field: 'amount', message: 'Amount is too large' })
  }

  if (!data.description?.trim()) {
    errors.push({ field: 'description', message: 'Description is required' })
  }
  else if (data.description.trim().length > 500) {
    errors.push({ field: 'description', message: 'Description must be 500 characters or less' })
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' })
  }
  else {
    const parsed = new Date(data.date + 'T00:00:00Z')
    if (isNaN(parsed.getTime())) {
      errors.push({ field: 'date', message: 'Invalid date' })
    }
  }

  return errors
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one digit' }
  }
  return { valid: true }
}
