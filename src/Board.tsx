import type { BoardProps } from "boardgame.io/react"
import type { GameState, card } from "./types"
import ScoreTable from "./components/scoreTable"
import Hand from "./components/Hand"
/* import Button from "@mui/material/Button" */
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core"
import { Ctx } from "boardgame.io"
import { useState } from "react"
import { Transition } from "@headlessui/react"

interface SixNimmtProps extends BoardProps<GameState> {}
interface CardProps {
  card: card
  key?: number
}

interface CardButtonProps {
  card: card
  playCard: () => void
  key: number
}

interface EndTurnButtonProps {
  endTurn: () => void
  disabled: boolean
}

interface selectPileButtonProps {
  selectPileMove: () => void
  key: number
  disabled: boolean
}

interface handProps {
  hand: card[]
  playCard: () => void
}

interface pileProps {
  cards: card[]
  /* key: number */
}

interface pileButtonProps {
  cards: card[]
  key: number
  disabled: boolean
  selectPileMove: () => void
}

const Card = ({ card, key }: CardProps) => {
  return (
    <div className="card" key={key || ""}>
      <div className="text-center">{card.val}</div>
      <div className="text-center">{card.bulls}</div>
    </div>
  )
}
const CardButton = ({ card, playCard, key }: CardButtonProps) => {
  return (
    <button
      className="bg-blue-300 rounded min-w-max my-1 mx-1 animate-in fade-in"
      onClick={playCard}
      key={key}
    >
      <Card card={card} />
    </button>
  )
}

const EndTurnButton = ({ endTurn, disabled }: EndTurnButtonProps) => (
  <button
    className="btn bg-green-400 disabled:bg-green-200"
    onClick={endTurn}
    disabled={disabled}
  >
    End Turn
  </button>
)

const SelectPileButton = ({ selectPileMove, disabled, key }: selectPileButtonProps) => (
  <button
    className="btn bg-slate-400 disabled:bg-slate-100"
    onClick={selectPileMove}
    key={key}
    disabled={disabled}
  >
    {key}
  </button>
)

const Pile = ({ cards }: pileProps) => {
  return (
    <div className="flex shadow group py-2 px-1 group-hover:bg-slate-100">
      {cards.map((c, i) => (
        <div className="card bg-blue-300 group-hover:bg-blue-400 mx-1" key={i}>
          <Card card={c} />
        </div>
      ))}
    </div>
  )
}

const PileButton = ({ cards, selectPileMove, disabled, index }: pileButtonProps) => (
  <div>
    <button
      onClick={selectPileMove}
      disabled={disabled}
      aria-label={`pile ${index}`}
      className={"p-2 m-2" + (!disabled ? " group" : "")}
    >
      <Pile cards={cards} />
    </button>
  </div>
)

const SixNimmtBoard = ({ G, ctx, events, playerID, moves }: SixNimmtProps) => {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap justify-start">
        {G.players[playerID!].hand.map((card, i) =>
          CardButton({ card, playCard: () => moves.playCard(i, playerID), key: i })
        )}
      </div>
      {G.players[playerID!].playedCard && (
        <div aria-label="played card" className="card bg-purple-200">
          <Card card={G.players[playerID!].playedCard!} />
        </div>
      )}
      <section aria-label="piles" className="flex-1 flex-col">
        {G.piles.map((cards, key) => (
          <PileButton
            cards={cards}
            key={key}
            index={key}
            selectPileMove={() => moves.choosePileMove(key)}
            disabled={(ctx.activePlayers || {})[playerID!] != "playerSelection"}
          />
        ))}
      </section>
      <div className="flex justify-center">
        <EndTurnButton
          endTurn={() => events.endTurn!()}
          disabled={ctx.currentPlayer !== playerID}
        />
      </div>
      <ScoreTable G={G} />
    </div>
  )
}

export default SixNimmtBoard
