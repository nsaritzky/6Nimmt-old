import cardData from "./cards"
import type { Ctx, Game, Move, PlayerID } from "boardgame.io"
import { TurnOrder } from "boardgame.io/core"
import { GameState, card, PlayerState, Piles, PublicState } from "./types"
import { filterWithIndex } from "fp-ts/Record"

const stripSecrets = (
  { piles, players }: GameState,
  _ctx: Ctx,
  playerID: PlayerID
): PublicState => {
  // const isNotThisPlayer: Predicate<PlayerID> = (id, _) => id != playerID
  return {
    piles,
    players: filterWithIndex((id: PlayerID, _) => id === playerID)(players),
  }
}

// Game setup /////////////////////////////////////////////////////////////////

const sortedDeck: card[] = cardData.map((bulls, val) => ({
  val: val + 1,
  bulls: bulls,
}))

const setup: typeof SixNimmt.setup = (ctx) => {
  const players: Record<PlayerID, PlayerState> = {}
  const deck = ctx.random!.Shuffle(sortedDeck)
  // The deck is full, so these shift calls will all succeed.
  const piles: Piles = [
    [deck.shift()!],
    [deck.shift()!],
    [deck.shift()!],
    [deck.shift()!],
  ]
  for (var i = 0; i < ctx.numPlayers; ++i) {
    players[i + ""] = {
      hand: deck.splice(0, 10).sort(),
      score: 0,
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

export const drawCards: Move<GameState> = (G, ctx, n = 1) => {
  for (var i = 0; i < n; ++i) {
    const newCard = G.deck.pop()
    if (newCard) {
      G.players[ctx.currentPlayer].hand.push(newCard)
    }
  }
}

export const playCard: Move<GameState> = (
  G,
  ctx,
  cardIndex: number,
  playerID: PlayerID
) => {
  const curr = G.players[playerID]
  ctx.log!.setMetadata(`Played card ${curr.hand[cardIndex].val}`)
  curr.playedCard = curr.hand.splice(cardIndex, 1)[0]
  // If everyone has played, work out the resolution phase order
  if (Object.values(G.players).every((p) => p.playedCard)) {
    determineResolutionOrder(G)
  }
}

// Resolve Phase //////////////////////////////////////////////////////////////

const eatPile: Move<GameState> = (
  G,
  ctx,
  pileIndex: number // {
) => {
  G.players[ctx.currentPlayer].score += G.piles[pileIndex].reduce(
    (score, { bulls }) => score + bulls,
    0
  )
  G.piles[pileIndex] = []
  ctx.log!.setMetadata(
    `Selected Pile: ${pileIndex}, Card: ${G.players[ctx.currentPlayer].playedCard!.val}`
  )
}
export const selectPile: Move<GameState> = (G, ctx) => {
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
    ctx.log!.setMetadata({ autoSelect })
    if (autoSelect === -1) {
      ctx.events!.setActivePlayers({ currentPlayer: "playerSelection" })
    } else {
      curr.selectedPile = autoSelect
    }
  }
}

export const resolveCard: Move<GameState> = (G, ctx) => {
  console.log(`resolving card for player ${ctx.currentPlayer}`)
  const curr = G.players[ctx.currentPlayer]
  const thisPile = G.piles[curr.selectedPile!]
  if (thisPile) {
    G = thisPile.length >= 5 ? eatPile(G, ctx, curr.selectedPile) : G

    thisPile.push(curr.playedCard!)
    delete curr.playedCard
    delete curr.selectedPile
    G.resolveCounter += 1
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
const choosePileMove: Move<GameState> = (G, ctx, pileIndex: number) => {
  G.players[ctx.currentPlayer].selectedPile = pileIndex
  G = eatPile(G, ctx, pileIndex)
  ctx.events!.endStage()
}

export const SixNimmt: Game<GameState> = {
  setup,

  playerView: (G, ctx, playerID) => {
    return stripSecrets(G, ctx, playerID!)
  },

  turn: {
    minMoves: 1,
    maxMoves: 1,
    onEnd: (_, ctx) =>
      console.log(`End of turn ${ctx.turn} for player ${ctx.currentPlayer}`),
  },

  phases: {
    play: {
      start: true,
      turn: {
        activePlayers: { all: "playACard", minMoves: 1, maxMoves: 1 },
        stages: {
          playACard: {
            moves: { playCard },
          },
        },
        onEnd: (_, ctx) =>
          console.log(`End of turn ${ctx.turn} for player ${ctx.currentPlayer}`),
      },
      moves: { playCard },
      endIf: (G) => Object.values(G.players).every((p) => p.playedCard),
      onEnd: () => console.log("Ending play phase"),
      next: "pileSelection",
    },
    pileSelection: {
      moves: {},
      turn: {
        activePlayers: { maxMoves: 1 },
        order: {
          ...TurnOrder.CUSTOM_FROM("resolveOrder"),
          next: (_G, ctx) => {
            if (ctx.playOrderPos < ctx.numPlayers - 1) {
              return ctx.playOrderPos + 1
            }
          },
        },
        stages: {
          playerSelection: {
            moves: { choosePileMove },
          },
        },
        onEnd: resolveCard,
        onBegin: selectPile,
      },
      // TODO This hook triggers turn end (again), which runs resolveCard. But
      // there's no card to resolve, so it fails.
      // endIf: ({ resolveCounter }, { numPlayers }) => resolveCounter >= numPlayers,
      onEnd: () => console.log("Ending resolve phase"),
      next: "play",
    },
  },
}
