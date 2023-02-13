import { maia1200, stockfish } from "../src/engine";
import { evaluate } from "../src/evaluate";

const FEN_1 = "r3kbnr/ppp2ppp/8/3Pp3/3n1PR1/3P4/PPP1BP1q/RNBQK3 b Qkq - 0 9";

describe(FEN_1, () => {
  it("should include Bc5", async () => {
    const evalu = await evaluate(`fen ${FEN_1}`);
    console.log(evalu);
    
  });
});


afterAll(() => {
  [stockfish, maia1200].forEach(engine => engine.engineProcess.kill())
})