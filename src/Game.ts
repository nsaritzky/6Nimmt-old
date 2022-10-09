import cardData from "./cards"
import type { Ctx, Game, Move, PlayerID } from "boardgame.io"
import { ActivePlayers, Stage, TurnOrder } from "boardgame.io/core"
import { GameState, card, PlayerState, Piles, PublicState } from "./types"
import { filterWithIndex } from "fp-ts/Record"
import { NonEmptyArray } from "fp-ts/NonEmptyArray"
import { omit } from "fp-ts-std/Struct"
import produce from "immer"
import { flow } from "fp-ts/function"
import { append } from "fp-ts/array"

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
  bulls,
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

export const drawCards: Move<GameState> = (G, ctx, n = 1) => {
  for (let i = 0; i < n; ++i) {
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
}
// G.players[ctx.currentPlayer].score += G.piles[pileIndex].reduce(
//   (score, { bulls }) => score + bulls,
//   0
// )
// const playedCard = G.players[ctx.currentPlayer].playedCard
// if (!playedCard) {
//   throw Error(`eatPile: No played card for Player ${ctx.currentPlayer}`)
// } else {
//   G.piles[pileIndex] = []
// }
// ctx.log!.setMetadata(
//   `Selected Pile: ${pileIndex}, Card: ${G.players[ctx.currentPlayer].playedCard!.val}`
// )
// console.log(`${G.piles[pileIndex].reduce((score, { bulls }) => score + bulls, 0)}`)
// return {
//   ...G,
//   piles: { ...G.piles, [pileIndex]: [] },
//   players: {
//     ...G.players,
//     [ctx.currentPlayer]: {
//       ...G.players[ctx.currentPlayer],
//       score:
//         G.players[ctx.currentPlayer].score +
//         G.piles[pileIndex].reduce((score, { bulls }) => score + bulls, 0),
//     },
//   },
// }

export const selectPile: Move<GameState> = (G, ctx) => {
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
    ctx.log!.setMetadata({ autoSelect })
    if (autoSelect === -1) {
      ctx.events!.setActivePlayers({
        currentPlayer: "playerSelection",
        minMoves: 1,
        maxMoves: 1,
      })
    } else {
      curr.selectedPile = autoSelect
    }
  }
}

export const resolveCard: Move<GameState> = (G, ctx) => {
  console.log(`resolving card for player ${ctx.currentPlayer}`)
  const curr = G.players[ctx.currentPlayer]
  const thisPile = G.piles[curr.selectedPile!]

  if (!curr.playedCard) {
    // Added this as a workaround for the double-calling of this function at
    // the end of each round.
    console.log(
      `resolveCard: No played card for Player ${ctx.currentPlayer}; skipping resolution`
    )
  } else {
    if (thisPile) {
      // G = thisPile.length >= 5 ? eatPile(G, ctx, curr.selectedPile) : G
      if (thisPile.length >= 5) {
        G = eatPile(G, ctx, curr.selectedPile)
      }
      thisPile.push(curr.playedCard)
    }

    delete curr.playedCard
    delete curr.resolveOrder

    // const { playedCard, resolveOrder, ...rest } = curr
    // return {
    //   ...G,
    //   piles: {
    //     ...G.piles,
    //     [curr.selectedPile!]: G.piles[curr.selectedPile!].push(curr.playedCard!),
    //   },
    //   players: {
    //     ...G.players,
    //     [ctx.currentPlayer]: rest,
    //   },
    // }
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

const choosePileMove = (G: GameState, ctx: Ctx, pileIndex: number) => {
  G.players[ctx.currentPlayer].selectedPile = pileIndex
  G = eatPile(G, ctx, pileIndex)
  ctx.events!.endStage()
}

const endGame: Move<GameState> = (G) => {
  if (Object.values(G.players).every((p) => p.hand.length == 0 && !p.playedCard)) {
    const topScore = Math.max(...Object.values(G.players).map((p) => p.score))
    return {
      winner: Object.entries(G.players).find(([id, p]) => p.score === topScore)![0],
    }
  }
}

export const SixNimmt: Game<GameState> = {
  name: "6Nimmt!",
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
        activePlayers: ActivePlayers.ALL_ONCE,
        minMoves: 1,
        // maxMoves: 1,
        // stages: {
        //   playACard: {
        //     moves: { playCard },
        //   },
        // },

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
        maxMoves: 1,
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
        onBegin: selectPile,
        onEnd: resolveCard,
      },
      // TODO This hook triggers turn end (again), which runs resolveCard. But
      // there's no card to resolve, so it fails.
      // endIf: ({ resolveCounter }, { numPlayers }) => resolveCounter >= numPlayers,
      // onEnd: (G) => {
      //   for (const player of Object.values(G.players)) {
      //     delete player.playedCard
      //     delete player.resolveOrder
      //   }
      // },
      next: "play",
    },
  },
  endIf: endGame,
}
