import { maia1200, stockfish } from "../src/engine";
import { evaluate, Evaluation, logResults } from "../src/evaluate";

const jestConsole = console;

beforeEach(() => {
  global.console = require("console");
});

afterEach(() => {
  global.console = jestConsole;
});

function filterTopMoves(evaluation: Evaluation) {
  return evaluation.filter((move) => Math.abs(evaluation[0].q - move.q) < 0.1);
}

const TEST_CASES = {
  // "r3kbnr/ppp2ppp/8/3Pp3/3n1PR1/3P4/PPP1BP1q/RNBQK3 b Qkq - 0 9": "f8c5",
  // "r1bqkb1r/pp3p1p/2n3p1/2ppN3/4nP2/5B2/PPPP2PP/RNBQK2R b KQkq - 1 9": "c8h3",
  // "rnb1kb1r/pp4pp/2p5/3p4/5Pn1/2NBq3/PPP3PP/RN1Q1R1K b kq - 1 12": "f8c5",
  // "r1b1r3/pppk1p1N/1qn1p3/3pP1Q1/3P4/2PB4/PP3PPP/R1K4R w - - 3 16": "g5g7",
  // "3k1b1r/pb1p1ppp/1N6/8/3Qn2q/8/PPP2PPP/R1B1KB1R w KQ - 0 11": "d4d7", // mate in 1
  // "K7/R1P5/P7/3k4/8/7p/7P/8 w - - 1 69": "c7c8q", // nie promuje na hetmana tylko jakieś gówno
  "5r1k/4bp1p/R7/3Pp3/1PP2pnP/P4QP1/4NP1q/1R3K2 b - - 10 38": "h2h1" // tego ruchu na pewno nie, podstawil hetmana
};

for (const [FEN, TOP_MOVE] of Object.entries(TEST_CASES)) {
  describe(FEN, () => {
    it(`should suggest ${TOP_MOVE} as top move`, async () => {
      const { evaluation } = await evaluate(`fen ${FEN}`);
      const topMoves = filterTopMoves(evaluation);
      console.log(topMoves);

      expect(topMoves).toContainEqual(expect.objectContaining({ move: TOP_MOVE }));
    });
  });
}

afterAll(() => {
  [stockfish, maia1200].forEach((engine) => engine.engineProcess.kill());
});
