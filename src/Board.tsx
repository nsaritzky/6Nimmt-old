import type { BoardProps } from "boardgame.io/react"
import type { GameState, card } from "./types"
import Button from "@mui/material/Button"
import { Ctx } from "boardgame.io"
import { useState } from "react"

interface SixNimmtProps extends BoardProps<GameState> {}
interface CardProps {
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

const Card = ({ card, playCard, key }: CardProps) => {
  const { val, bulls } = card
  return (
    <Button variant="outlined" onClick={playCard} key={key}>
      {val + " | " + bulls}
    </Button>
  )
}

const EndTurnButton = ({ endTurn, disabled }: EndTurnButtonProps) => (
  <Button variant="contained" color="secondary" onClick={endTurn} disabled={disabled}>
    End Turn
  </Button>
)

const SelectPileButton = ({ selectPileMove, disabled, key }: selectPileButtonProps) => (
  <Button variant="outlined" onClick={selectPileMove} key={key} disabled={disabled}>
    {key}
  </Button>
)

const SixNimmtBoard = ({ G, ctx, events, playerID, moves }: SixNimmtProps) => {
  return (
    <div>
      <h1 key={playerID}>
        {G.players[playerID!].hand.map((card, i) =>
          Card({ card, playCard: () => moves.playCard(i, playerID), key: i })
        )}
      </h1>
      <span>
        {G.piles.map((_, i) =>
          SelectPileButton({
            selectPileMove: () => moves.choosePileMove(i),
            key: i,
            disabled: (ctx.activePlayers || {})[playerID!] != "playerSelection",
          })
        )}
      </span>
      <div>
        <EndTurnButton
          endTurn={() => events.endTurn!()}
          disabled={ctx.currentPlayer !== playerID}
        />
      </div>
    </div>
  )
}

export default SixNimmtBoard
