import SixNimmtBoard from "./Board"
import { SixNimmt } from "./Game"
import { render, screen, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import userEvent from "@testing-library/user-event"
import { Client } from "boardgame.io/react"
import { Local } from "boardgame.io/multiplayer"

const SixNimmtClient = Client({
  game: { ...SixNimmt, seed: "random" },
  multiplayer: Local(),
  board: SixNimmtBoard,
})

test("play a card", async () => {
  render(<SixNimmtClient playerID="0" />)
  const user = userEvent.setup()
  const card = screen.getByRole("button", { name: "40 1" })
  await user.click(card)
  const playedCard = screen.getByLabelText("played card")
  expect(playedCard).toHaveTextContent("401")

  /* const piles = screen.getByRole(button) */

  expect(screen.getByRole("region", { name: "piles" }))
})
