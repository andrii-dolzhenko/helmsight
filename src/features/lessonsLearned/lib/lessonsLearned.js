import { LESSON_CATEGORIES } from '../api/lessonsLearnedService.js'

const categoryLabels = new Map(LESSON_CATEGORIES.map(({ value, label }) => [value, label]))

export function getLessonCategoryLabel(value) {
  return categoryLabels.get(value) ?? 'Other'
}

export function filterSortLessons(lessons, { query = '', category = 'all', sort = 'newest' } = {}) {
  const needle = query.trim().toLocaleLowerCase()
  const filtered = lessons.filter((item) => {
    if (category !== 'all' && item.category !== category) return false
    if (!needle) return true
    return [item.title, item.situation, item.lesson, item.recommendation]
      .some((value) => String(value ?? '').toLocaleLowerCase().includes(needle))
  })

  return [...filtered].sort((left, right) => {
    if (sort === 'title') {
      return left.title.localeCompare(right.title) || left.id.localeCompare(right.id)
    }
    const field = sort === 'updated' ? 'updatedAt' : 'createdAt'
    const compared = String(left[field] ?? '').localeCompare(String(right[field] ?? ''))
    return (sort === 'oldest' ? compared : -compared) || left.id.localeCompare(right.id)
  })
}
