import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { convertCpToQ, convertQToCp, Position, roundToTwoDecimals } from "./utils";

export async function analyse(position: string, depth: number) {
  const tree = new Map();

  let depthLeft = depth;

  const initialEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  const bestMove = initialEval[0];
  const candidateMoves = initialEval.filter((move) =>
    "mate" in bestMove ? "mate" in move && move.mate > 0 : bestMove.q - move.q < 0.2
  );

  let deepEval: any[] = [];

  while (depthLeft > 0) {
    for (const moveScore of candidateMoves) {
      const q = await expectimax(Position(position, moveScore.move), depthLeft - 1, NodeType.Chance, moveScore.q, tree);
      deepEval.push({ ...moveScore, q });
    }

    deepEval.sort((a, b) => {
      return a.q > b.q ? -1 : 1;
    });

    logResults(deepEval, depth - depthLeft);

    deepEval = []
    depthLeft--;
  }

  // if (depth % 2 !== 0) {
  //   deepEval.map(moveScore => )
  // }

  // console.log(
  //   [...tree.entries()].sort(([aKey, aVal], [bKey, bVal]) => {
  //     if (aKey.length - bKey.length !== 0) {
  //       return aKey.length - bKey.length ? -1 : 1;
  //     } else {
  //       if ("prob" in aVal) {
  //         return aVal.prob - bVal.prob ? -1 : 1;
  //       } else {
  //         return aVal.q - bVal.q ? -1 : 1;
  //       }
  //     }
  //   }).map(el => `${el[0]} ${el[1].q && " q " + el[1].q}${el[1].prob && " prob " + el[1].prob}`)
  // );

  return { evaluation: deepEval };
}

enum NodeType {
  Max,
  Chance,
}

async function expectimax(position: string, depth: number, nodeType: NodeType, previousQ: number, tree: Map<any, any>) {
  // console.log(position, depth);

  const positionEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
    ...moveScore,
    q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
  }));

  if (positionEval.length === 0) {
    console.log("Terminal node " + position);
    return previousQ;
  }

  const bestMove = positionEval[0];

  if (depth === 0) {
    return "mate" in bestMove ? (bestMove.mate > 0 ? 1 : -1) : bestMove.q;
    // return convertCpToQ("mate" in bestMove ? (bestMove.mate > 0 ? 12800 : -12800) : bestMove.cp);
  }

  switch (nodeType) {
    case NodeType.Max: {
      let value = Number.NEGATIVE_INFINITY;

      const candidateMoves = positionEval.filter((move) =>
        "mate" in bestMove ? "mate" in move && move.mate > 0 : bestMove.q - move.q < 0.2
      );

      for (const moveScore of candidateMoves) {
        const positionMove = Position(position, moveScore.move);
        if (tree.has(positionMove)) return tree.get(positionMove);

        value = Math.max(value, await expectimax(positionMove, depth - 1, NodeType.Chance, bestMove.q, tree));
        tree.set(positionMove, { q: value });
      }

      return value;
    }
    case NodeType.Chance: {
      const probabilities = await maia1200.analyse(position);
      const possibleResponses = probabilities.filter((move) => {
        return move.policy > 15;
      });

      if (!possibleResponses.length) return previousQ;

      let value = 0;

      const policiesSum = possibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

      const candidateMoves = possibleResponses.map((response) => ({
        ...response,
        policy: response.policy / policiesSum,
      }));

      // console.log(candidateMoves, policiesSum, possibleResponses);

      for (const moveScore of candidateMoves) {
        const positionMove = Position(position, moveScore.move);
        if (tree.has(positionMove)) return tree.get(positionMove);

        value +=
          moveScore.policy *
          (await expectimax(positionMove, depth - 1, NodeType.Max, bestMove.q, tree));
        // if (position.includes("f8c5  c2c3")) {
        //   console.log("node type max position " + position + " value " + value);
        // }
        // console.log(depth === 0 && nodeType === NodeType.Chance);

        tree.set(positionMove, { prob: moveScore.policy });
      }

      // console.log("node type chance position " + position + " value " + value);

      return value;

      // return (
      //   candidateMoves
      //     .map((moveScore) => ({
      //       ...moveScore,
      //       policy: moveScore.policy / policiesSum,
      //     }))
      //     .reduce((total, moveScore) => total + moveScore.policy, 0) / candidateMoves.length
      // );
    }
  }
}

// async function expectiminimax(
//   position: string,
//   depth: number,
//   turn: "own" | "opponent" | "random",
//   previousQ: number
// ): Promise<number> {
//   console.log(position, depth);

//   const initialEval = (await stockfish.analyse(position, 1)).map((moveScore) => ({
//     ...moveScore,
//     q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
//   }));

//   // console.log(previousQ);

//   if (initialEval.length === 0) {
//     console.log("Terminal node" + position);
//     return previousQ;
//   }

//   //     if depth = 0 or node is a terminal node then
//   //         return the heuristic value of node
//   if (depth === 0) {
//     const bestMove = initialEval[0];
//     return convertCpToQ("mate" in bestMove ? (bestMove.mate > 0 ? 12800 : -12800) : bestMove.cp);
//   }

//   if (turn === "own") {
//     let value = Number.NEGATIVE_INFINITY;

//     const safestMove = initialEval[0];

//     const candidateMoves = initialEval.filter((move) =>
//       "mate" in safestMove ? "mate" in move && move.mate > 0 : safestMove.q - move.q < 0.25
//     );

//     for (const moveScore of candidateMoves) {
//       value = Math.max(value, await expectiminimax(`${position} ${moveScore.move}`, depth - 1, "random", previousQ));
//     }

//     return value;
//   } else if (turn === "opponent") {
//     let value = Number.POSITIVE_INFINITY;
//     // const possibleResponses = await maia1200.analyse(position);

//     // const candidateMoves = possibleResponses.filter((move) => move.policy > 0.1);

//     // // const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();
//     // const candidatesEvals = new Map<string, { response: string; q: number; cp: number; policy: number }[]>();

//     // for (const moveCandidate of candidateMoves) {
//     //   candidatesEvals.set(moveCandidate.move, []);
//     //   const answerEval = (await stockfish.analyse(Position(position, moveCandidate.move), 1)).map((moveScore) => ({
//     //     ...moveScore,
//     //     q: convertCpToQ("mate" in moveScore ? (moveScore.mate > 0 ? 12800 : -12800) : moveScore.cp),
//     //   }));
//     //   const answerEvalQ = answerEval[0].q;

//     //   candidatesEvals.set(moveCandidate.move, [
//     //     ...candidatesEvals.get(moveCandidate.move)!,
//     //     { response: moveCandidate.move, policy: moveCandidate.policy, q: answerEvalQ, cp: convertQToCp(answerEvalQ) },
//     //   ]);
//     // }

//     // if (!candidatesEvals.size) return previousQ;

//     for (const moveScore of initialEval) {
//       value = Math.min(value, await expectiminimax(`${position} ${moveScore.move}`, depth - 1, "own", previousQ));
//     }

//     return value;
//   } else  {
//     let value = 0;
//     const possibleResponses = (await maia1200.analyse(position)).filter((move) => move.policy > 0.1);

//     const policiesSum = possibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

//     const candidateMoves = possibleResponses.map((response) => ({
//       ...response,
//       policy: response.policy / policiesSum,
//     }));

//     for (const moveScore of candidateMoves) {
//       value =
//         value +
//         moveScore.policy * (await expectiminimax(`${position} ${moveScore.move}`, depth - 1, "opponent", previousQ));
//     }

//     return value;
//   }
// }

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

export function logResults(evaluation: Evaluation, depth: number): void {
  evaluation.forEach((pv, index) =>
    console.log(
      "info score" +
        (!("mate" in pv) ? ` cp ${convertQToCp(pv.q)} q ${roundToTwoDecimals(pv.q)}` : "") +
        ("mate" in pv ? ` mate ${pv.mate}` : "") +
        ` pv ${pv.move} multipv ${index + 1} depth ${depth}` +
        ` string sfpv ${pv.multipv}`
    )
  );

  console.log(`bestmove ${evaluation[0].move}`);
}
