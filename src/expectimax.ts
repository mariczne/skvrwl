import { CHANCE_NODE_SELECTION_THRESHOLD, MAX_NODE_SELECTION_THRESHOLD } from "../config";
import { engineB, engineA } from "./engine";
import { convertMateScoreToQ, createPosition, isMateScore, replaceMoveScoreCpWithQ } from "./utils";

export enum NodeType {
  Max = "MAX",
  Chance = "CHANCE",
}

export async function expectimax(position: string, depth: number, nodeType: NodeType, previousQ: number) {
  const positionEval = (await engineA.analyse(position, 1)).map(replaceMoveScoreCpWithQ);

  if (positionEval.length === 0) return previousQ; // terminal node

  const bestMove = positionEval[0];

  if (depth === 0) {
    return (
      (isMateScore(bestMove) ? convertMateScoreToQ(bestMove) : bestMove.q) * (nodeType === NodeType.Chance ? -1 : 1)
    );
  }

  switch (nodeType) {
    case NodeType.Max: {
      let nodeValue = Number.NEGATIVE_INFINITY;

      const candidateMoves = positionEval.filter((move) =>
        isMateScore(bestMove) ? isMateScore(move) && move.mate > 0 : bestMove.q - move.q < MAX_NODE_SELECTION_THRESHOLD
      );

      for (const moveScore of candidateMoves) {
        const positionMove = createPosition(position, moveScore.move);
        nodeValue = Math.max(nodeValue, await expectimax(positionMove, depth - 1, NodeType.Chance, bestMove.q));
      }

      return nodeValue;
    }
    case NodeType.Chance: {
      const probabilities = await engineB.analyse(position);
      const possibleResponses = probabilities.filter((move) => move.policy > CHANCE_NODE_SELECTION_THRESHOLD);

      if (!possibleResponses.length) {
        if (probabilities.length) {
          possibleResponses.push(probabilities[0]);
        } else {
          return previousQ;
        }
      }

      let nodeValue = 0;

      const policiesSum = possibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

      const candidateMoves = possibleResponses.map((response) => ({
        ...response,
        policy: response.policy / policiesSum,
      }));

      for (const moveScore of candidateMoves) {
        const positionMove = createPosition(position, moveScore.move);
        nodeValue += moveScore.policy * (await expectimax(positionMove, depth - 1, NodeType.Max, bestMove.q));
      }

      return nodeValue;
    }
  }
}
