import type { Game, Move, Ctx } from 'boardgame.io'
import type { card, Piles } from './types'

export const placeCard = (c: card, ps: Piles): Piles => {
    const minDifference = Math.min(...ps.map(p => c.val - p[-1].val).filter(n => n > 0))
    const thisPile = ps.findIndex(p => c.val - p[-1].val == minDifference)
    ps[thisPile].push(c)
    return ps
}
