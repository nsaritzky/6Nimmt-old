import cardData from "./cards"
import type { Ctx, Game, Move, PlayerID } from "boardgame.io"
import { TurnOrder } from "boardgame.io/core"
import { GameState, card, PlayerState, Piles, PublicState } from "./types"
import { filterWithIndex } from "fp-ts/Record"

// const setStageForPlayer = (
//   G: GameState,
//   ctx: Ctx,
//   stage: string,
//   playerID: PlayerID
// ) => {
//   ctx.events!.setActivePlayers({
//     value: { playerID: stage },
//   })
// }

const stripSecrets = (
  { piles, players }: GameState,
  _ctx: Ctx,
  playerID: PlayerID
): PublicState => {
  // const isNotThisPlayer: Predicate<PlayerID> = (id, _) => id != playerID
  return {
    piles,
    players: filterWithIndex((id: PlayerID, _) => id == playerID)(players),
  }
}

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
    players[i + ""] = { hand: deck.splice(0, 10).sort(), score: 0 }
  }
  return {
    players,
    deck,
    piles,
  }
}

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
  _ctx,
  cardIndex: number,
  playerID: PlayerID
) => {
  const curr = G.players[playerID]
  curr.playedCard = curr.hand.splice(cardIndex, 1)[0]
  if (Object.values(G.players).every((p) => p.playedCard)) {
    determineResolutionOrder(G)
  }
}

const eatPile: Move<GameState> = (G, ctx, pileIndex: number): GameState => {
  G.players[ctx.currentPlayer].score += G.piles[pileIndex].reduce(
    (score, { bulls }) => score + bulls,
    0
  )
  G.piles[pileIndex] = []
  return G
}

export const resolveCardMove: Move<GameState> = (G, ctx) => {
  const curr = G.players[ctx.currentPlayer]
  const c = curr.playedCard
  if (!c) {
    throw ReferenceError("Player's played card not found")
  } else {
    const thisPileIndex = G.piles.findIndex(
      (p) =>
        c.val - p[-1].val ===
        Math.min(...G.piles.map((p) => c.val - p[-1].val).filter((n) => n > 0))
    )
    const thisPile = G.piles[thisPileIndex]
    if (thisPile) {
      if (thisPile.length >= 4) {
        G = eatPile(G, ctx, thisPileIndex)
      }
    } else {
      ctx.events!.setStage("choosePile")
    }
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
// Object.values(G.players)
//   .sort((playerA, playerB) => playerA.playedCard!.val - playerB.playedCard!.val)
//   .forEach((player, index) => (player.resolveOrder = index).toString)

// Object.entries(G.players)
//   .sort(
//     ([idA, playerA], [idB, playerB]) =>
//       playerA.playedCard!.val - playerB.playedCard!.val
//   )
//   .map(([id, _]) => id)

const choosePileMove: Move<GameState> = (G, ctx, pileIndex: number) => {
  G = eatPile(G, ctx, pileIndex)
}

export const SixNimmt: Game<GameState> = {
  setup,

  moves: {
    draw: drawCards,
  },

  playerView: (G, ctx, playerID) => {
    return stripSecrets(G, ctx, playerID!)
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
      },
      moves: { playCard },
      endIf: (G) => Object.values(G.players).every((p) => p.playedCard),
      next: "resolve",
    },
    resolve: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("resolveOrder"),
      },
      moves: { resolveCardMove },
    },
  },
}
