import type { FootballFormat } from '@prisma/client'
import { getDefaultScheme } from '@/lib/formations'
import type { SlotLayout } from '@/lib/formation-slot-layout'

export const CUSTOM_SCHEME_PREFIX = 'custom:'

export type UserFormationTemplateDto = {
  id: string
  name: string
  baseScheme: string
  footballFormat: FootballFormat
  slotLayout: SlotLayout
}

export function customSchemeValue(templateId: string): string {
  return `${CUSTOM_SCHEME_PREFIX}${templateId}`
}

export function parseCustomSchemeId(value: string): string | null {
  if (!value.startsWith(CUSTOM_SCHEME_PREFIX)) return null
  const id = value.slice(CUSTOM_SCHEME_PREFIX.length)
  return id.length > 0 ? id : null
}

export function isCustomSchemeValue(value: string): boolean {
  return parseCustomSchemeId(value) !== null
}

export function formatTemplateOptionLabel(name: string, baseScheme: string): string {
  return `${name} (${baseScheme})`
}

export function resolveEditorSchemeSelection(
  selectValue: string,
  templates: UserFormationTemplateDto[],
  footballFormat: FootballFormat
): { scheme: string; slotLayout: SlotLayout; templateId: string | null } {
  const templateId = parseCustomSchemeId(selectValue)
  if (templateId) {
    const template = templates.find((t) => t.id === templateId)
    if (template) {
      return {
        scheme: template.baseScheme,
        slotLayout: template.slotLayout,
        templateId: template.id,
      }
    }
    return {
      scheme: getDefaultScheme(footballFormat),
      slotLayout: {},
      templateId: null,
    }
  }

  return {
    scheme: selectValue,
    slotLayout: {},
    templateId: null,
  }
}
