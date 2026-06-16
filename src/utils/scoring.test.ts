import { describe, it, expect } from 'vitest'
import { deriveWinner, calculatePoints } from './scoring'

// ─────────────────────────────────────────────
// deriveWinner
// ─────────────────────────────────────────────
describe('deriveWinner', () => {
  it('returns "home" when home score is higher', () => {
    expect(deriveWinner(3, 1)).toBe('home')
    expect(deriveWinner(7, 1)).toBe('home') // Germany vs Curacao
    expect(deriveWinner(1, 0)).toBe('home')
  })

  it('returns "away" when away score is higher', () => {
    expect(deriveWinner(0, 1)).toBe('away')
    expect(deriveWinner(1, 4)).toBe('away')
    expect(deriveWinner(2, 3)).toBe('away')
  })

  it('returns "draw" when scores are equal', () => {
    expect(deriveWinner(0, 0)).toBe('draw')
    expect(deriveWinner(1, 1)).toBe('draw')
    expect(deriveWinner(3, 3)).toBe('draw')
  })
})

// ─────────────────────────────────────────────
// calculatePoints — exact scoreline (3 pts)
// ─────────────────────────────────────────────
describe('calculatePoints — exact scoreline = 3 pts', () => {
  it('awards 3 pts for an exact home win prediction', () => {
    expect(calculatePoints(2, 1, 2, 1)).toBe(3)
  })

  it('awards 3 pts for an exact away win prediction', () => {
    expect(calculatePoints(0, 2, 0, 2)).toBe(3)
  })

  it('awards 3 pts for an exact draw prediction', () => {
    expect(calculatePoints(1, 1, 1, 1)).toBe(3)
  })

  it('awards 3 pts for an exact 0-0 draw', () => {
    expect(calculatePoints(0, 0, 0, 0)).toBe(3)
  })

  it('awards 3 pts for the Germany 7-1 result if predicted exactly', () => {
    expect(calculatePoints(7, 1, 7, 1)).toBe(3)
  })
})

// ─────────────────────────────────────────────
// calculatePoints — correct result (1 pt)
// ─────────────────────────────────────────────
describe('calculatePoints — correct result = 1 pt', () => {
  it('awards 1 pt for correct home win, wrong scoreline', () => {
    expect(calculatePoints(2, 0, 3, 1)).toBe(1) // predicted 2-0, actual 3-1
    expect(calculatePoints(1, 0, 7, 1)).toBe(1) // predicted Germany to win, right
  })

  it('awards 1 pt for correct away win, wrong scoreline', () => {
    expect(calculatePoints(0, 1, 0, 3)).toBe(1)
    expect(calculatePoints(1, 2, 0, 1)).toBe(1)
  })

  it('awards 1 pt for correct draw prediction, wrong scoreline', () => {
    expect(calculatePoints(0, 0, 2, 2)).toBe(1)
    expect(calculatePoints(2, 2, 1, 1)).toBe(1)
  })
})

// ─────────────────────────────────────────────
// calculatePoints — wrong result (0 pts)
// ─────────────────────────────────────────────
describe('calculatePoints — wrong result = 0 pts', () => {
  it('awards 0 pts when predicting a win but it was a draw', () => {
    expect(calculatePoints(2, 1, 1, 1)).toBe(0)
    expect(calculatePoints(0, 1, 2, 2)).toBe(0)
  })

  it('awards 0 pts when predicting the wrong winner', () => {
    expect(calculatePoints(2, 0, 0, 1)).toBe(0) // predicted home win, away won
    expect(calculatePoints(0, 3, 2, 1)).toBe(0) // predicted away win, home won
  })

  it('awards 0 pts when predicting a draw but there was a winner', () => {
    expect(calculatePoints(1, 1, 2, 0)).toBe(0)
    expect(calculatePoints(2, 2, 1, 3)).toBe(0)
  })

  it('awards 0 pts when predicting Germany to lose but they won 7-1', () => {
    expect(calculatePoints(1, 3, 7, 1)).toBe(0) // predicted Curacao win, Germany won
  })
})

// ─────────────────────────────────────────────
// Full scenario: a group of 3 players, 1 match
// ─────────────────────────────────────────────
describe('multi-player scenario: Brazil 2-1 Argentina', () => {
  const homeActual = 2
  const awayActual = 1

  it('player who picked exact score (2-1) gets 3 pts', () => {
    expect(calculatePoints(2, 1, homeActual, awayActual)).toBe(3)
  })

  it('player who picked correct winner (3-0) gets 1 pt', () => {
    expect(calculatePoints(3, 0, homeActual, awayActual)).toBe(1)
  })

  it('player who picked a draw gets 0 pts', () => {
    expect(calculatePoints(1, 1, homeActual, awayActual)).toBe(0)
  })

  it('player who picked away win gets 0 pts', () => {
    expect(calculatePoints(0, 2, homeActual, awayActual)).toBe(0)
  })
})
