import { expect, it, describe, afterAll } from "bun:test";
import { engineB, engineA } from "../src/engine";
import { analyse } from "../src/evaluate";
import { MoveScoreQ } from "../src/utils";

function filterTopMoves(evaluation: MoveScoreQ[]) {
  return evaluation.filter((move) => Math.abs(evaluation[0].q - move.q) < 0.1).map((moveScore) => moveScore.move);
}

// const move = (move: string) => ({cp: expect.any, mate: expect.any,
//    multipv: expect.any, q: expect.any, move})

const TEST_CASES: Record<string, { desc: string; call: (topMoves: string[]) => void }> = {
  "r3kbnr/ppp2ppp/8/3Pp3/3n1PR1/3P4/PPP1BP1q/RNBQK3 b Qkq - 0 9": {
    desc: "should suggest f8c5 as top move",
    call: (topMoves) => expect(topMoves).toContain("f8c5"),
  },
  "r1bqkb1r/pp3p1p/2n3p1/2ppN3/4nP2/5B2/PPPP2PP/RNBQK2R b KQkq - 1 9": {
    desc: "should suggest c8h3 as top move",
    call: (topMoves) => expect(topMoves).toContain("c8h3"),
  },
  "rnb1kb1r/pp4pp/2p5/3p4/5Pn1/2NBq3/PPP3PP/RN1Q1R1K b kq - 1 12": {
    desc: "should suggest f8c5 as top move",
    call: (topMoves) => expect(topMoves).toContain("f8c5"),
  },
  "r1b1r3/pppk1p1N/1qn1p3/3pP1Q1/3P4/2PB4/PP3PPP/R1K4R w - - 3 16": {
    desc: "should suggest g5g7 as top move",
    call: (topMoves) => expect(topMoves).toContain("g5g7"),
  },
  "3k1b1r/pb1p1ppp/1N6/8/3Qn2q/8/PPP2PPP/R1B1KB1R w KQ - 0 11": {
    desc: "should suggest d4d7 as top move", // mate in 1
    call: (topMoves) => expect(topMoves).toContain("d4d7"),
  },
  "K7/R1P5/P7/3k4/8/7p/7P/8 w - - 1 69": {
    desc: "should suggest c7c8q as top move", // nie promuje na hetmana
    call: (topMoves) => expect(topMoves).toContain("c7c8q"),
  },
} as const;

for (const [FEN, TEST] of Object.entries(TEST_CASES)) {
  describe(FEN, () => {
    it(
      TEST.desc,
      async () => {
        const { evaluation } = await analyse(`fen ${FEN}`, 2);

        const topMoves = filterTopMoves(evaluation);
        console.log(topMoves);

        TEST.call(topMoves);
      },
      90000
    );
  });
}

afterAll(() => {
  [engineA, engineB].forEach((engine) => engine.exit());
});
