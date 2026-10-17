export const emailRules = {
  required: 'Enter your email address.',
  validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || 'Enter a valid email address.',
}

export const passwordRules = {
  required: 'Enter a password.',
  minLength: { value: 8, message: 'Use at least 8 characters.' },
}

export const fullNameRules = {
  required: 'Enter your name.',
  validate: (value) => value.trim().length >= 2 || 'Enter at least 2 characters.',
}

export const confirmPasswordRules = (getValues) => ({
  required: 'Confirm your password.',
  validate: (value) => value === getValues('password') || 'Passwords do not match.',
})
