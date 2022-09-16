import { describe, test } from "@jest/globals"
import { SixNimmt } from "./Game"
import { Client } from "boardgame.io/client"

test("Scenario", () => {
    const game = { ...SixNimmt, seed: "fixed-seed" }

    const client0 = Client({
        game,
        numPlayers: 2,
        playerID: "0",
    })
    const client1 = Client({
        game,
        numPlayers: 2,
        playerID: "1",
    })

    client0.moves.playCard(0, 0)
    client1.moves.playCard(0, 1)

    const { G: G0, ctx: ctx0 } = client0.getState()!
    const { G: G1, ctx: ctx1 } = client1.getState()!

    expect(G0.players["0"].playedCard!.val).toEqual(53)
    expect(G1.players["1"].playedCard!.val).toEqual(61)
    expect(ctx0.playOrder).toEqual(["0", "1"])
    expect(ctx0.numPlayers).toEqual(2)
})

// test("transition to resolve phase", () => {
//     expect()
// })
