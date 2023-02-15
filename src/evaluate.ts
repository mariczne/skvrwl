import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { convertCpToQ, convertQToCp, Position, roundToTwoDecimals } from "./utils";

export async function analyse(position: string, depth: number) {
  const initialEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  const deepEval = [];

  for (const moveScore of initialEval) {
    const q = await minimax(`${position} ${moveScore.move}`, depth - 1, true, moveScore.q);
    deepEval.push({ ...moveScore, q });
  }

  deepEval.sort((a, b) => {
    return a.q > b.q ? -1 : 1;
  });

  return { evaluation: deepEval };
}

// function minimax(node, depth, maximizingPlayer) is
//     if depth = 0 or node is a terminal node then
//         return the heuristic value of node
//     if maximizingPlayer then
//         value := −∞
//         for each child of node do
//             value := max(value, minimax(child, depth − 1, FALSE))
//         return value
//     else (* minimizing player *)
//         value := +∞
//         for each child of node do
//             value := min(value, minimax(child, depth − 1, TRUE))
//         return value

async function minimax(position: string, depth: number, ownTurn: boolean, previousQ: number): Promise<number> {
  const initialEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  console.log(previousQ);

  if (initialEval.length === 0) {
    console.log("Terminal node" + position);
    return previousQ;
  }

  //     if depth = 0 or node is a terminal node then
  //         return the heuristic value of node
  if (depth === 0) {
    const bestMove = initialEval[0];
    return convertCpToQ("mate" in bestMove ? (bestMove.mate > 0 ? 12800 : -12800) : bestMove.cp);
  }

  if (ownTurn) {
    let value = Number.NEGATIVE_INFINITY;

    const safestMove = initialEval[0];

    const candidateMoves = initialEval.filter((move) =>
      "mate" in safestMove ? "mate" in move && move.mate > 0 : safestMove.q - move.q < 0.25
    );

    for (const moveScore of candidateMoves) {
      value = Math.max(value, await minimax(`${position} ${moveScore.move}`, depth - 1, false, previousQ));
    }

    return value;
  } else {
    let value = Number.NEGATIVE_INFINITY;
    const possibleResponses = await maia1200.analyse(position);

    const candidateMoves = possibleResponses.filter((move) => move.policy > 0.1);

    // const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();
    const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();

    for (const moveCandidate of candidateMoves) {
      candidatesEvals.set(moveCandidate.move, []);
      const answerEval = (await stockfish.analyse(Position(position, moveCandidate.move), 1)).map((moveScore) => ({
        ...moveScore,
        q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
      }));
      const answerEvalQ = answerEval[0].q;

      candidatesEvals.set(moveCandidate.move, [
        ...candidatesEvals.get(moveCandidate.move)!,
        { response: moveCandidate.move, policy: moveCandidate.policy, q: answerEvalQ, cp: convertQToCp(answerEvalQ) },
      ]);
    }

    if (!candidatesEvals.size) return previousQ;

    for (const [move, answers] of candidatesEvals.entries()) {
      if (!answers.length) continue;

      const policiesSum = answers.reduce((prev, curr) => prev + curr.policy, 0);
      const trapEval = answers.reduce((prev, curr) => prev + curr.q * (curr.policy / policiesSum), 0);
      value = Math.max(trapEval, await minimax(`${position} ${move}`, depth - 1, true, previousQ));
    }

    return value;
  }
}

export async function evaluate(position: string) {
  [maia1200, stockfish].forEach((engine) => engine.send("ucinewgame"));

  const initialEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  // console.log(initialEval);

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
        const answerEval = (await stockfish.analyse(Position(position, moveCandidate.move, answer.move), 1)).map(
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
    // console.log(move, answers, trapEval);

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
      cp: convertQToCp(trapEval),
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
