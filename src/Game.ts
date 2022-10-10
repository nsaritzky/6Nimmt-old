import cardData from "./cards"
import type { Ctx, Game, Move, PlayerID, FnContext } from "boardgame.io"
import { GameState, card, PlayerState, Piles, PublicState } from "./types"
import { filterWithIndex } from "fp-ts/Record"
import { ActivePlayers, TurnOrder } from "boardgame.io/core"

const playerView = (
  { piles, players }: GameState,
  _ctx: Ctx,
  playerID: PlayerID | null
): PublicState => {
  // const isNotThisPlayer: Predicate<PlayerID> = (id, _) => id != playerID
  return {
    piles,
    players: filterWithIndex((id: PlayerID, _) => id === playerID)(players),
  }
}

const findByMin = <T>(Obs: T[], measure: (ob: T) => number): T => {
  const max = Math.min(...Obs.map(measure))
  return Obs.find((ob) => measure(ob) === max)!
}

// Game setup /////////////////////////////////////////////////////////////////

const sortedDeck: card[] = cardData.map((bulls, val) => ({
  val: val + 1,
  bulls,
}))

const setup: typeof SixNimmt.setup = ({ ctx, random }) => {
  const players: Record<PlayerID, PlayerState> = {}
  const deck = random!.Shuffle(sortedDeck)
  // The deck is full, so these shift calls will all succeed.
  const piles: Piles = [
    [deck.shift()!],
    [deck.shift()!],
    [deck.shift()!],
    [deck.shift()!],
  ]
  for (let i = 0; i < ctx.numPlayers; ++i) {
    players[i + ""] = {
      hand: deck.splice(0, 10).sort(),
      score: 0,
      resolved: false,
    }
  }

  return {
    players,
    deck,
    piles,
    resolveCounter: 0,
  }
}

// Moves //////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

// Play Phase /////////////////////////////////////////////////////////////////

export const drawCards: Move<GameState> = ({ G, ctx }, n = 1) => {
  for (let i = 0; i < n; ++i) {
    const newCard = G.deck.pop()
    if (newCard) {
      G.players[ctx.currentPlayer].hand.push(newCard)
    }
  }
}

export const playCard: Move<GameState> = (
  { G, ctx },
  cardIndex: number,
  playerID: PlayerID
) => {
  const curr = G.players[playerID]
  curr.playedCard = curr.hand.splice(cardIndex, 1)[0]
  // If everyone has played, work out the resolution phase order
  if (Object.values(G.players).every((p) => p.playedCard)) {
    determineResolutionOrder(G)
  }
}

const determineResolutionOrder = (G: GameState) => {
  G.resolveOrder = Object.entries(G.players)
    .sort(
      ([_idA, playerA], [_idB, playerB]) =>
        playerA.playedCard!.val - playerB.playedCard!.val
    )
    .map(([id, _]) => id)
  return G
}

const autoSelect = ({ G, ctx, events }: FnContext<GameState>) => {
  if (!G.piles.every((p) => p.length > 0)) {
    throw Error("selectPile: One or more of the piles is empty when it shouldn't be")
  }
  const curr = G.players[ctx.currentPlayer]
  const c = curr.playedCard
  if (!c) {
    throw ReferenceError(`Player ${ctx.currentPlayer}'s' played card not found`)
  } else {
    const autoSelect = G.piles.findIndex(
      (p) =>
        c.val - p[p.length - 1].val ===
        Math.min(
          ...G.piles.map((p) => c.val - p[p.length - 1].val).filter((n) => n > 0)
        )
    )
    if (autoSelect === -1) {
      events.setActivePlayers({
        currentPlayer: "playerSelection",
        minMoves: 1,
        maxMoves: 1,
      })
    } else {
      if (G.piles[autoSelect].length >= 5) {
        G.players[ctx.currentPlayer].score += devourPileScore(G, autoSelect)
        G.piles[autoSelect] = []
      }
      G.piles[autoSelect].push(c)
      delete curr.resolveOrder
      delete curr.playedCard
      events.endTurn()
    }
  }
}

const devourPileScore = (G: GameState, pileIndex: number): number =>
  G.piles[pileIndex].reduce((score, { bulls }) => score + bulls, 0)

const choosePileMove: Move<GameState> = (
  { G, ctx, playerID, events },
  pileIndex: number
) => {
  G.players[ctx.currentPlayer].score += devourPileScore(G, pileIndex)
  G.piles[pileIndex] = []
  G.piles[pileIndex].push(G.players[ctx.currentPlayer].playedCard!)
  delete G.players[ctx.currentPlayer].resolveOrder
  delete G.players[ctx.currentPlayer].playedCard
  events.endStage()
}

const roundEnd = ({ G, ctx }: FnContext<GameState>) => {
  if (Object.values(G.players).every((p) => p.hand.length === 0 && ctx.turn > 30)) {
    return findByMin(Object.entries(G.players), ([_id, p]) => p.score)[0]
  }
}

export const SixNimmt: Game<GameState> = {
  name: "6Nimmt!",
  setup,
  playerView: ({ G, playerID }) =>
    // const isNotThisPlayer: Predicate<PlayerID> = (id, _) => id != playerID
    ({
      piles: G.piles,
      players: filterWithIndex((id: PlayerID, _) => id === playerID)(G.players),
    }),

  turn: {
    minMoves: 1,
    maxMoves: 1,
  },

  phases: {
    play: {
      start: true,
      turn: {
        activePlayers: ActivePlayers.ALL_ONCE,
        minMoves: 1,
      },
      moves: { playCard },
      endIf: ({ G }) => Object.values(G.players).every((p) => p.playedCard),
      next: "pileSelection",
    },
    pileSelection: {
      moves: {},
      turn: {
        onBegin: autoSelect,
        maxMoves: 1,
        order: {
          ...TurnOrder.CUSTOM_FROM("resolveOrder"),
          next: ({ ctx }) => {
            if (ctx.playOrderPos < ctx.numPlayers - 1) {
              return ctx.playOrderPos + 1
            }
          },
        },
        stages: {
          playerSelection: {
            moves: {
              choosePileMove,
            },
          },
        },
      },
      next: "play",
    },
  },
  endIf: roundEnd,
}
