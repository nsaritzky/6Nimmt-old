import { SixNimmt } from "../Game"
import type { PlayerState, GameState } from "../types"

const ScoreTable = ({ G }: { G: GameState }) => {
  console.log(G.players)
  return (
    <div className="w-32">
      <table className="w-full text-lg ">
        <tr className="w-full font-bold bg-gray-200">
          <th colspan={2}>Score</th>
        </tr>
        {Object.entries(G.players).map(([id, p]) => (
          <tr className="w-full py-2 bg-gray-100">
            <td className="pr-4">Player {id}</td>
            <td>{p.score}</td>
          </tr>
        ))}
      </table>
    </div>
  )
}

export default ScoreTable
