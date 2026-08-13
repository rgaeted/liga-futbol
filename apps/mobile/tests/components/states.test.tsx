import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ErrorState } from '../../src/components/states/ErrorState'

describe('state components', () => {
  it('shows Reintentar without leaking internal error details', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="No pudimos cargar la información" onRetry={onRetry} />)
    expect(screen.getByLabelText('Reintentar')).toBeTruthy()
    expect(screen.queryByText(/schema_mismatch/)).toBeNull()
    fireEvent.click(screen.getByLabelText('Reintentar'))
    expect(onRetry).toHaveBeenCalled()
  })
})
