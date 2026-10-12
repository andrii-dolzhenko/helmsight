export function isValidCalendarDate(value) {
  if (typeof value !== 'string') return false

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  if (year < 1 || month < 1 || month > 12) return false

  const isLeapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)

  const daysInMonth = [
    31, isLeapYear ? 29 : 28, 31, 30, 31, 30,
    31, 31, 30, 31, 30, 31,
  ]

  return day >= 1 && day <= daysInMonth[month - 1]
}
