import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockClearErrors = vi.fn()

vi.mock('../store', () => ({
  useStore: vi.fn()
}))

import { useStore } from '../store'
import type { ErrorLogEntry } from '../store'
import { ErrorLog } from './ErrorLog'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockStore(errorLog: ErrorLogEntry[]) {
  vi.mocked(useStore).mockImplementation((selector: (s: any) => any) =>
    selector({ errorLog, clearErrors: mockClearErrors })
  )
}

function makeEntry(overrides: Partial<ErrorLogEntry> = {}): ErrorLogEntry {
  return {
    id: 'test-id-1',
    timestamp: 1700000000000,
    source: 'pipeline',
    message: 'Something went wrong',
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  // scrollIntoView is not implemented in jsdom
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  // mock clipboard API
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorLog', () => {
  describe('empty state', () => {
    it('renders nothing when errorLog is empty', () => {
      mockStore([])
      const { container } = render(<ErrorLog />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('with errors', () => {
    it('renders the Errors heading', () => {
      mockStore([makeEntry()])
      render(<ErrorLog />)
      expect(screen.getByText('Errors')).toBeInTheDocument()
    })

    it('shows the error count badge', () => {
      mockStore([makeEntry(), makeEntry({ id: 'test-id-2' })])
      render(<ErrorLog />)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('displays error message text when expanded', () => {
      mockStore([makeEntry({ message: 'Audio extraction failed' })])
      render(<ErrorLog />)
      // Component auto-expands via useEffect when errors are present
      expect(screen.getByText('Audio extraction failed')).toBeInTheDocument()
    })

    it('shows source badge label for known sources', () => {
      mockStore([makeEntry({ source: 'pipeline' })])
      render(<ErrorLog />)
      expect(screen.getByText('PIPE')).toBeInTheDocument()
    })

    it('shows source badge for ffmpeg source', () => {
      mockStore([makeEntry({ source: 'ffmpeg' })])
      render(<ErrorLog />)
      expect(screen.getByText('FF')).toBeInTheDocument()
    })

    it('shows multiple error entries', () => {
      mockStore([
        makeEntry({ id: '1', message: 'Error one' }),
        makeEntry({ id: '2', message: 'Error two' })
      ])
      render(<ErrorLog />)
      expect(screen.getByText('Error one')).toBeInTheDocument()
      expect(screen.getByText('Error two')).toBeInTheDocument()
    })
  })

  describe('clear button', () => {
    it('calls clearErrors when the trash button is clicked', () => {
      mockStore([makeEntry()])
      render(<ErrorLog />)
      // The clear button has title "Clear errors"
      const clearBtn = screen.getByTitle('Clear errors')
      fireEvent.click(clearBtn)
      expect(mockClearErrors).toHaveBeenCalledTimes(1)
    })
  })

  describe('toggle expand/collapse', () => {
    it('toggles error list visibility on header click', () => {
      mockStore([makeEntry({ message: 'Toggle test error' })])
      render(<ErrorLog />)

      // Initially expanded (auto-expanded by useEffect)
      expect(screen.getByText('Toggle test error')).toBeInTheDocument()

      // Click header to collapse
      fireEvent.click(screen.getByText('Errors'))
      expect(screen.queryByText('Toggle test error')).not.toBeInTheDocument()

      // Click again to expand
      fireEvent.click(screen.getByText('Errors'))
      expect(screen.getByText('Toggle test error')).toBeInTheDocument()
    })
  })
})
