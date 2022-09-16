import type { BoardProps } from "boardgame.io/react"
import type { GameState, card } from "./types"
import Button from "@mui/material/Button"

interface SixNimmtProps extends BoardProps<GameState> { }
interface CardProps {
    card: card
    playCard: () => void
    key: number
}

const Card = ({ card, playCard, key }: CardProps) => {
    const { val, bulls } = card
    return (
        <Button variant="outlined" onClick={playCard} key={key}>
            {val + " | " + bulls}
        </Button>
    )
}

const SixNimmtBoard = ({ G, playerID, moves }: SixNimmtProps) => (
    <h1>
        {G.players[playerID!].hand.map((card, i) =>
            Card({ card, playCard: () => moves.playCard(i, playerID), key: i })
        )}
    </h1>
)

export default SixNimmtBoard
