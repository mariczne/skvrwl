import { maia1200, stockfish } from "./engine";
import { convertCpToQ, convertQToCp, createPosition, roundToTwoDecimals } from "./utils";

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
      const q = await expectimax(createPosition(position, moveScore.move), depthLeft - 1, NodeType.Chance, moveScore.q, tree);
      deepEval.push({ ...moveScore, q });
    }

    deepEval.sort((a, b) => {
      return a.q > b.q ? -1 : 1;
    });

    logResults(deepEval, depth - depthLeft);

    deepEval = [];
    depthLeft--;
  }

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
  }

  switch (nodeType) {
    case NodeType.Max: {
      let value = Number.NEGATIVE_INFINITY;

      const candidateMoves = positionEval.filter((move) =>
        "mate" in bestMove ? "mate" in move && move.mate > 0 : bestMove.q - move.q < 0.2
      );

      for (const moveScore of candidateMoves) {
        const positionMove = createPosition(position, moveScore.move);
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

      for (const moveScore of candidateMoves) {
        const positionMove = createPosition(position, moveScore.move);
        if (tree.has(positionMove)) return tree.get(positionMove);

        value += moveScore.policy * (await expectimax(positionMove, depth - 1, NodeType.Max, bestMove.q, tree));

        tree.set(positionMove, { prob: moveScore.policy });
      }

      return value;
    }
  }
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
