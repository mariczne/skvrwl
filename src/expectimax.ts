import { performance } from "perf_hooks";
import { CHANCE_NODE_SELECTION_THRESHOLD, MAX_NODE_SELECTION_THRESHOLD } from "../config";
import { engineB, engineA } from "./engine";
import { createPosition, replaceMoveScoreCpWithQ, writeLine } from "./utils";
import { Logger } from "./log";

export const NodeType = {
  Max: "MAX",
  Chance: "CHANCE",
} as const;

export type NodeType = (typeof NodeType)[keyof typeof NodeType];

export async function expectimax(position: string, depth: number, nodeType: NodeType, previousQ: number) {
  // const perfAStart = performance.now();
  const positionEval = (await engineA.analyse(position, 6)).map(replaceMoveScoreCpWithQ);
  // const perfAEnd = performance.now();
  // Logger.debug("engineA anal took " + (perfAEnd - perfAStart));

  if (positionEval.length === 0) return previousQ; // terminal node

  const bestMoveQ = positionEval[0].q * (nodeType === NodeType.Chance ? -1 : 1);

  Logger.debug(position, bestMoveQ, nodeType);

  if (depth === 0) {
    return bestMoveQ;
  }

  switch (nodeType) {
    case NodeType.Max: {
      let nodeValue = Number.NEGATIVE_INFINITY;

      const candidateMoves = positionEval.filter((move) => bestMoveQ - move.q < MAX_NODE_SELECTION_THRESHOLD);

      for (const moveScore of candidateMoves) {
        const positionMove = createPosition(position, moveScore.move);
        nodeValue = Math.max(nodeValue, await expectimax(positionMove, depth - 1, NodeType.Chance, bestMoveQ));
      }

      return nodeValue;
    }
    case NodeType.Chance: {
      // const perfBStart = performance.now();
      const probabilities = await engineB.analyse(position);
      // const perfBEnd = performance.now();
      // Logger.debug("engineB anal took " + (perfBEnd - perfBStart));

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
        nodeValue += moveScore.policy * (await expectimax(positionMove, depth - 1, NodeType.Max, bestMoveQ));
      }

      return nodeValue;
    }
  }
}
