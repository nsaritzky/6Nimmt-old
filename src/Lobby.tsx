import { Lobby } from "boardgame.io/react"
import { SixNimmt } from "./Game"
import SixNimmtBoard from "./Board"

const SixNimmtLobby = () => (
  <Lobby
    gameServer={`http://$:8008`}
    lobbyServer={`http://${window.location.hostname}:8008`}
    gameComponents={[{ game: SixNimmt, board: SixNimmtBoard }]}
  />
)

export default SixNimmtLobby
