import { describe, expect, it } from 'vitest'
import {
  CUSTOM_SCHEME_PREFIX,
  customSchemeValue,
  parseCustomSchemeId,
  isCustomSchemeValue,
  formatTemplateOptionLabel,
  resolveEditorSchemeSelection,
  type UserFormationTemplateDto,
} from '@/lib/user-formation-templates'

const templates: UserFormationTemplateDto[] = [
  {
    id: 'tpl1',
    name: 'Rombo medio',
    baseScheme: '4-4-2',
    footballFormat: 'FUTBOL_11',
    slotLayout: { CM_L: { topPct: 50, leftPct: 50 } },
  },
]

describe('custom scheme prefix', () => {
  it('builds and parses custom values', () => {
    expect(customSchemeValue('tpl1')).toBe(`${CUSTOM_SCHEME_PREFIX}tpl1`)
    expect(parseCustomSchemeId(`${CUSTOM_SCHEME_PREFIX}tpl1`)).toBe('tpl1')
    expect(isCustomSchemeValue('4-4-2')).toBe(false)
  })
})

describe('formatTemplateOptionLabel', () => {
  it('shows name and base scheme', () => {
    expect(formatTemplateOptionLabel('Rombo medio', '4-4-2')).toBe('Rombo medio (4-4-2)')
  })
})

describe('resolveEditorSchemeSelection', () => {
  it('returns empty layout for classic scheme', () => {
    const result = resolveEditorSchemeSelection('4-3-3', templates, 'FUTBOL_11')
    expect(result).toEqual({ scheme: '4-3-3', slotLayout: {}, templateId: null })
  })

  it('resolves custom template to base scheme and layout', () => {
    const result = resolveEditorSchemeSelection(customSchemeValue('tpl1'), templates, 'FUTBOL_11')
    expect(result.scheme).toBe('4-4-2')
    expect(result.slotLayout).toEqual({ CM_L: { topPct: 50, leftPct: 50 } })
    expect(result.templateId).toBe('tpl1')
  })

  it('falls back to default when custom id missing', () => {
    const result = resolveEditorSchemeSelection(customSchemeValue('missing'), templates, 'FUTBOL_11')
    expect(result.scheme).toBe('4-3-3')
    expect(result.templateId).toBe(null)
  })
})
