export type bulls = 1 | 2 | 3 | 4 | 5
export type card = { val: number; bulls: bulls }
export type PlayerState = {
    hand: card[]
    score: number
    playedCard?: card
    resolveOrder?: number
}
export type PlayerID = string
export type Piles = [card[], card[], card[], card[]]

// export interface PublicState {
//     piles: Piles
//     players: Record<PlayerID, PlayerState>
// }

export interface GameState {
    deck: card[]
    players: Record<PlayerID, PlayerState>
    piles: Piles
    resolveOrder?: PlayerID[]
}

export type PublicState = Pick<GameState, "piles" | "players">
