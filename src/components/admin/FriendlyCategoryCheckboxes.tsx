'use client'

type Props = {
  categories: Array<{ id: string; name: string }>
  selectedIds: string[]
  onChange: (ids: string[]) => void
  namePrefix?: string
}

export function FriendlyCategoryCheckboxes({
  categories,
  selectedIds,
  onChange,
  namePrefix = 'category',
}: Props) {
  function toggle(categoryId: string, checked: boolean) {
    if (checked) {
      onChange([...new Set([...selectedIds, categoryId])])
    } else {
      onChange(selectedIds.filter((id) => id !== categoryId))
    }
  }

  if (categories.length === 0) {
    return <p className="text-sm text-kelme-gray-400">No hay categorías disponibles.</p>
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-kelme-gray-600">Categorías</legend>
      <ul className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <li key={category.id}>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`${namePrefix}-${category.id}`}
                checked={selectedIds.includes(category.id)}
                onChange={(e) => toggle(category.id, e.target.checked)}
              />
              {category.name}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  )
}

export function readCategoryIdsFromForm(form: FormData, prefix = 'category'): string[] {
  const ids: string[] = []
  for (const [key, value] of form.entries()) {
    if (key.startsWith(`${prefix}-`) && value === 'on') {
      ids.push(key.slice(prefix.length + 1))
    }
  }
  return ids
}
