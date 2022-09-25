import { describe, test } from "@jest/globals"
import * as GM from "./Game"
import { Client } from "boardgame.io/client"
import { Local } from "boardgame.io/multiplayer"

test("Scenario", () => {
    const game = { ...GM.SixNimmt, seed: "fixed-seed", multiplayer: Local }

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

    let { G: G0, ctx: ctx0 } = client0.getState()!
    let { G: G1, ctx: ctx1 } = client1.getState()!

    expect(G0.players["0"].playedCard!.val).toEqual(53)
    expect(G1.players["1"].playedCard!.val).toEqual(61)
    expect(ctx0.playOrder).toEqual(["0", "1"])
    expect(ctx0.numPlayers).toEqual(2)
})

test("Pile eating example", () => {
    const game = { ...GM.SixNimmt, seed: "l8bnkb62" }

    const clientSpec = Client({
        game,
        multiplayer: Local(),
    })

    const client0 = Client({
        game,
        multiplayer: Local(),
        playerID: "0",
    })
    const client1 = Client({
        game,
        multiplayer: Local(),
        playerID: "1",
    })

    client0.start()
    client1.start()

    client0.moves.playCard(4, 0) // (82, 1)
    client1.moves.playCard(4, 1) //     (61, 1)

    client0.events.endTurn!()
    client1.events.endTurn!()

    client0.moves.playCard(6, 0)
    client1.moves.playCard(5, 1)

    client1.moves.choosePileMove(0)
    client1.events.endTurn!()

    let { G: G0, ctx: ctx0 } = client0.getState()!
    let { G: G1, ctx: ctx1 } = client1.getState()!

    expect(ctx1).toBe(ctx0)
    expect(G1.players[1].score).toEqual(3)
    expect(G1.piles[0]).toEqual([{ bulls: 3, val: 20 }]) // Check the client is keeping the states in sync
})

// test("transition to resolve phase", () => {
//     expect()
// })
