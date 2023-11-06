import { MAX_NODE_SELECTION_THRESHOLD } from "../config";
import { expectimax, NodeType } from "./expectimax";
import { movegen } from "./main";
import {
  createPosition,
  isMateScore,
  mapMoveScoreQToCp,
  MoveScoreQ,
  MoveScoreQOnly,
  replaceMoveScoreCpWithQ,
  sortByQDescending,
} from "./utils";

export async function evaluate(position: string, depth: number): Promise<MoveScoreQ[]> {
  const initialEval = (await movegen.analyse(position, 6)).map(replaceMoveScoreCpWithQ).toSorted(sortByQDescending); // from now on we operate on Q

  const bestMove = initialEval[0];

  const candidateMoves = initialEval.filter((move) =>
    isMateScore(bestMove) ? isMateScore(move) && move.mate > 0 : bestMove.q - move.q < MAX_NODE_SELECTION_THRESHOLD
  );

  if (!candidateMoves.length) candidateMoves.push(bestMove);

  const evaluation: MoveScoreQOnly[] = [];

  for (const moveScore of candidateMoves) {
    const q = await expectimax(createPosition(position, moveScore.move), depth, NodeType.Chance, moveScore.q);
    evaluation.push({ ...moveScore, q });
  }

  return evaluation.toSorted(sortByQDescending).map(mapMoveScoreQToCp);
}
