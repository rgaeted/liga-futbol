import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArticleCard } from '../../src/components/content/ArticleCard'
import { SponsorList } from '../../src/components/content/SponsorList'

describe('content screens', () => {
  it('renders published copy and accessible media fallback', () => {
    render(
      <ArticleCard
        article={{
          id: 'a-1',
          title: 'Fecha 1',
          summary: 'Resumen',
          coverUrl: null,
          publishedAt: '2026-08-20T15:00:00.000Z',
        }}
      />,
    )
    expect(screen.getByText('Fecha 1')).toBeTruthy()
    expect(screen.getByLabelText('Sin imagen de portada')).toBeTruthy()
  })

  it('requires explicit action for external sponsor URLs', () => {
    render(
      <SponsorList
        sponsors={[
          {
            id: 's-1',
            name: 'Kelme',
            logoUrl: null,
            bannerUrl: null,
            websiteUrl: 'https://kelme.cl',
            placement: 'SPONSORS_PAGE',
          },
        ]}
      />,
    )
    expect(screen.getByLabelText('Visitar sitio de Kelme')).toBeTruthy()
  })
})
