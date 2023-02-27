import { MAX_NODE_SELECTION_THRESHOLD } from "../config";
import { engineA } from "./engine";
import { expectimax, NodeType } from "./expectimax";
import {
  convertQToCp,
  createPosition,
  isMateScore,
  mapMoveScoreQToCp,
  MoveScoreQ,
  MoveScoreQOnly,
  replaceMoveScoreCpWithQ,
  roundToTwoDecimals,
  writeLine,
} from "./utils";

export async function analyse(position: string, depth: number) {
  const initialEval = (await engineA.analyse(position, 6)).map(replaceMoveScoreCpWithQ); // from now on we operate on Q
console.log(initialEval);

  const bestMove = initialEval[0];

  const candidateMoves = initialEval.filter((move) =>
    isMateScore(bestMove) ? isMateScore(move) && move.mate > 0 : bestMove.q - move.q < MAX_NODE_SELECTION_THRESHOLD
  );

  const evaluation: MoveScoreQOnly[] = [];

  for (const moveScore of candidateMoves) {
    const q = await expectimax(createPosition(position, moveScore.move), depth, NodeType.Chance, moveScore.q);
    evaluation.push({ ...moveScore, q });
  }

  evaluation.sort((a, b) => (a.q > b.q ? -1 : 1));
  const finalEval: MoveScoreQ[] = evaluation.map(mapMoveScoreQToCp);

  return { evaluation: finalEval };
}

export function printResults(evaluation: MoveScoreQOnly[], final = false): void {
  evaluation.forEach((pv, index) =>
    writeLine(
      `info multipv ${index + 1} score` +
        (!("mate" in pv) ? ` cp ${convertQToCp(pv.q)} q ${roundToTwoDecimals(pv.q)}` : "") +
        ` pv ${pv.move} string sfpv ${pv.multipv}`
    )
  );

  if (final) writeLine(`bestmove ${evaluation[0].move}`);
}
