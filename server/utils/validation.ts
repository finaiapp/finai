// Keep in sync with app/utils/validation.ts
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
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

export function sanitizeName(name: string): string {
  return name.trim().slice(0, 100)
}

export function validateCategoryName(name: string): { valid: boolean; message?: string } {
  const trimmed = name.trim()
  if (!trimmed) return { valid: false, message: 'Category name is required' }
  if (trimmed.length > 100) return { valid: false, message: 'Category name must be 100 characters or less' }
  return { valid: true }
}

// Keep in sync with app/utils/validation.ts
export function validateTransaction(data: Record<string, any>): { valid: boolean; message?: string } {
  if (!data.type || !['income', 'expense'].includes(data.type)) {
    return { valid: false, message: 'Type must be "income" or "expense"' }
  }

  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    return { valid: false, message: 'Amount must be a positive number' }
  }

  if (parseFloat(data.amount) > 9999999999.99) {
    return { valid: false, message: 'Amount is too large' }
  }

  if (!data.description?.trim()) {
    return { valid: false, message: 'Description is required' }
  }

  if (data.description.trim().length > 500) {
    return { valid: false, message: 'Description must be 500 characters or less' }
  }

  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { valid: false, message: 'Date must be in YYYY-MM-DD format' }
  }

  const parsed = new Date(data.date + 'T00:00:00Z')
  if (isNaN(parsed.getTime())) {
    return { valid: false, message: 'Invalid date' }
  }

  return { valid: true }
}
