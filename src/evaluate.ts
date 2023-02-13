import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { convertCpToQ, convertQToCp, Position, roundToTwoDecimals } from "./utils";

export async function evaluate(position: string): Promise<{ evaluation: Evaluation }> {
  [maia1200, stockfish].forEach((engine) => engine.send("ucinewgame"));

  const initialEval = (await stockfish.analyse(position, 6)).map((moveScore) => ({
    ...moveScore,
    q: "mate" in moveScore ? 1 : convertCpToQ(moveScore.cp),
  }));

  const safestMove = initialEval[0];

  let evaluation: Evaluation = [];

  const candidateMoves = initialEval.filter((move) => safestMove.q - move.q < 0.5);
  const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();

  for (const moveCandidate of candidateMoves) {
    candidatesEvals.set(moveCandidate.move, []);

    try {
      const possibleResponses = await maia1200.analyse(Position(position, moveCandidate.move));
      if (!possibleResponses.length) continue;

      let mostPossibleResponses = possibleResponses.filter((response) => response.policy >= 10);
      if (!mostPossibleResponses.length) mostPossibleResponses = [possibleResponses[0]]; // no responses above threshold

      const policiesSum = mostPossibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

      mostPossibleResponses = mostPossibleResponses.map((response) => ({
        ...response,
        policy: roundToTwoDecimals(response.policy / policiesSum),
      }));

      for (const answer of mostPossibleResponses) {
        const answerEval = (await stockfish.analyse(Position(position, moveCandidate.move, answer.move), 6)).map(
          (moveScore) => ({
            ...moveScore,
            q: "mate" in moveScore ? 1 : convertCpToQ(moveScore.cp),
          })
        );

        const answerEvalQ = answerEval[0].q;

        candidatesEvals.set(moveCandidate.move, [
          ...candidatesEvals.get(moveCandidate.move)!,
          { response: answer.move, policy: answer.policy, q: answerEvalQ, cp: convertQToCp(answerEvalQ) },
        ]);
      }

      if (!candidatesEvals.get(moveCandidate.move)?.length) continue;
    } catch (err) {
      console.error({ moveCandidate });
      appendFile(path.resolve("./errors.log"), `problem position: ${position}, move: ${moveCandidate?.move}\n`);
    }
  }

  if (!evaluation.length) evaluation.push(candidateMoves[0]);

  for (const [move, answers] of candidatesEvals.entries()) {
    if (!answers.length) continue;
    const trapEval = answers.reduce((prev, curr) => prev + curr.q * curr.policy, 0);

    evaluation.push({
      move,
      multipv: initialEval.find((moveScore) => moveScore.move === move)!.multipv,
      q: trapEval,
    });
  }

  evaluation.sort((a, b) => {
    return a.q > b.q ? -1 : 1;
  });

  return {
    evaluation,
  };
}

export type Evaluation = (
  | {
      move: string;
      multipv: number;
      q: number;
    }
  | {
      move: string;
      multipv: number;
      q: 1;
    }
)[];

export function logResults(evaluation: Evaluation): void {
  console.log(evaluation);

  evaluation.forEach((pv, index) =>
    console.log(
      "info score" +
        (!("mate" in pv) ? ` cp ${convertQToCp(pv.q)} q ${roundToTwoDecimals(pv.q)}` : "") +
        ("mate" in pv ? ` mate ${pv.mate}` : "") +
        ` pv ${pv.move} multipv ${index + 1}` +
        ` string sfpv ${pv.multipv}`
    )
  );

  console.log(`bestmove ${evaluation[0].move}`);
}
