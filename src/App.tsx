import { Local } from "boardgame.io/multiplayer"
import { Client } from "boardgame.io/react"
import { SixNimmt } from "./Game"
import SixNimmtBoard from "./Board"
import SixNimmtLobby from "./Lobby"

const SixNimmtClient = Client({
  game: SixNimmt,
  board: SixNimmtBoard,
  multiplayer: Local(),
  enhancer:
    window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__(),
})

const App = () => (
  <div>
    <h1 className="font-serif">Player 0</h1>
    <SixNimmtClient playerID="0" />
    <h1>Player 1</h1>
    <SixNimmtClient playerID="1" />
  </div>
)

export default App
