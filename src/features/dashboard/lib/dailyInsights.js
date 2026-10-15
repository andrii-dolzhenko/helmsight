export const DAILY_INSIGHTS = Object.freeze([
  {
    quote: 'Plans are nothing; planning is everything.',
    author: 'Dwight D. Eisenhower',
  },
  {
    quote: 'Clarity turns project noise into the next decision.',
    author: 'HelmSight',
  },
  {
    quote: 'A visible risk is easier to manage than a hidden assumption.',
    author: 'HelmSight',
  },
  {
    quote: 'Progress becomes useful when it changes the next decision.',
    author: 'HelmSight',
  },
  {
    quote: 'Good governance makes the next action easier to see.',
    author: 'HelmSight',
  },
  {
    quote: 'Measure the signal, not the activity around it.',
    author: 'HelmSight',
  },
  {
    quote: 'The best status view makes uncertainty visible early.',
    author: 'HelmSight',
  },
  {
    quote: 'Plans create direction; feedback keeps them relevant.',
    author: 'HelmSight',
  },
  {
    quote: 'Escalate while there are still useful options to choose from.',
    author: 'HelmSight',
  },
  {
    quote: 'A clear owner turns a concern into an actionable commitment.',
    author: 'HelmSight',
  },
  {
    quote: 'Delivery confidence grows when assumptions stay visible.',
    author: 'HelmSight',
  },
  {
    quote: 'Control is valuable when it helps the team decide sooner.',
    author: 'HelmSight',
  },
])

export function getDailyInsight(date = new Date()) {
  const localDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const dayIndex = Math.floor(localDay / 86_400_000)
  return DAILY_INSIGHTS[((dayIndex % DAILY_INSIGHTS.length) + DAILY_INSIGHTS.length) % DAILY_INSIGHTS.length]
}
