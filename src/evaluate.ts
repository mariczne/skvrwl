import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { convertCpToQ, convertQToCp, Position, roundToTwoDecimals } from "./utils";

export async function evaluate(position: string) {
  [maia1200, stockfish].forEach((engine) => engine.send("ucinewgame"));

  const initialEval = (await stockfish.analyse(position, 6)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  console.log(initialEval);

  if (!initialEval.length) return { evaluation: [] };

  const safestMove = initialEval[0];

  let evaluation = [];

  const candidateMoves = initialEval.filter((move) =>
    "mate" in safestMove ? "mate" in move && move.mate > 0 : safestMove.q - move.q < 0.5
  );
  const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();

  for (const moveCandidate of candidateMoves) {
    candidatesEvals.set(moveCandidate.move, []);

    try {
      const possibleResponses = await maia1200.analyse(Position(position, moveCandidate.move));
      if (!possibleResponses.length) {
        if ("mate" in moveCandidate) evaluation.push(moveCandidate);
        continue;
      }

      let mostPossibleResponses = possibleResponses.filter((response) => response.policy >= 10);
      if (!mostPossibleResponses.length) mostPossibleResponses = [possibleResponses[0]]; // no responses above threshold

      const policiesSum = mostPossibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

      mostPossibleResponses = mostPossibleResponses.map((response) => ({
        ...response,
        policy: response.policy / policiesSum,
      }));

      for (const answer of mostPossibleResponses) {
        const answerEval = (await stockfish.analyse(Position(position, moveCandidate.move, answer.move), 6)).map(
          (moveScore) => ({
            ...moveScore,
            q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
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

  if (!candidateMoves.length) evaluation.push(initialEval[0]);

  for (const [move, answers] of candidatesEvals.entries()) {
    if (!answers.length) continue;

    const policiesSum = answers.reduce((prev, curr) => prev + curr.policy, 0);
    const trapEval = answers.reduce((prev, curr) => prev + curr.q * (curr.policy / policiesSum), 0);
    console.log(move, answers, trapEval);

    const initialMoveEval = initialEval.find((moveScore) => moveScore.move === move)!;

    if ("mate" in initialMoveEval) {
      evaluation.push({
        move,
        multipv: initialMoveEval.multipv,
        q: convertCpToQ(initialMoveEval.mate > 0 ? 12800 : -12800),
        mate: initialMoveEval.mate,
      });
    }

    evaluation.push({
      move,
      multipv: initialMoveEval.multipv,
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

export type Evaluation = {
  move: string;
  multipv: number;
  q: number;
}[];

export function logResults(evaluation: Evaluation): void {
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
