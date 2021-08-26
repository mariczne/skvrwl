import { appendFile } from "fs/promises";
import path from "path";
import { maia, stockfish } from "./engine";
// import { getCurrentPOV, getScoreFromPOV } from "./utils";

export async function evaluate(position: string) {
  const sfInitialEval = await stockfish.analyse(position, 6);
  // console.log({ sfInitialEval });

  // console.log("Initial evaluation:", sfInitialEval);
  const safestMove = sfInitialEval[0];
  // const sideToMove = getCurrentPOV(position);

  const evaluation: any[] = [];

  for (const moveCandidate of sfInitialEval) {
    try {
      if ("mate" in moveCandidate) {
        // forced mate
        if (moveCandidate.mate! > 0) {
          evaluation.push({ ...moveCandidate, gain: 12800, loss: 0, puregain: 12800 });
        } else {
          evaluation.push({ ...moveCandidate, gain: 0, loss: 12800, puregain: -12800 });
        }
        continue;
      }

      // // short-circuit trap eval if it turns the tables     // if (safestMove.cp >= 0.5 && moveCandidate.cp <= 1) {
      //   evaluation.push(moveCandidate);
      //   continue;
      // }

      const possibleLoss = safestMove.cp - moveCandidate.cp;

      const mostPossibleResponses = await maia.analyse(
        `${position}${!position.includes("moves") ? " moves" : ""} ${moveCandidate.move}`
      );

      if (moveCandidate.move === "a4d7") console.log({ moveCandidate, mostPossibleResponses });

      if (!mostPossibleResponses.length) continue;

      const trapEvaluation = await stockfish.analyse(
        `${position}${!position.includes("moves") ? " moves" : ""} ${moveCandidate.move} ${
          mostPossibleResponses[0].move
        }`,
        4
      );

      if (!trapEvaluation.length || !("cp" in trapEvaluation[0])) continue;

      const possibleGain = trapEvaluation[0].cp - safestMove.cp;

      // moveCandidate.move === "g7g8" && console.log({trapEvaluation});

      // at least double score if we're already winning comfortably
      // if (
      //   getScoreFromPOV(safestMove.cp, sideToMove) >= 3 &&
      //   getScoreFromPOV(trapEvaluation[0].cp, sideToMove) <= 6
      // ) {
      //   evaluation.push(moveCandidate);
      //   continue;
      // }

      // if we're already winning we shouldn't take risks that would change that

      // safestMove.cp
      // moveCandidate.cp - the theoretically best reply score to subpar move
      // safestMove.cp - moveCandidate.cp will be positive
      // if trapEvaluation.cp - safestMove.cp positive = these are the moves we look for
      // then we look at moveCandidate again

      evaluation.push({
        move: moveCandidate.move,
        cp: trapEvaluation[0].cp,
        loss: possibleLoss,
        gain: possibleGain,
        puregain: possibleGain - possibleLoss,
      });
    } catch (err) {
      console.error({ moveCandidate });
      appendFile(path.resolve("./errors.log"), `problem position: ${position}, move: ${moveCandidate.move}\n`);
    }
  }

  evaluation.sort((a, b) => {
    // if (a.mate && b.mate) return a.mate > b.mate ? -1 : 1;
    // if (a.mate && !b.mate) return a.mate > 0 ? -1 : 1;
    // if (!a.mate && b.mate) return b.mate > 0 ? -1 : 1;
    if (a.puregain && b.puregain && a.puregain !== b.puregain) return a.puregain > b.puregain ? -1 : 1;
    if (a.cp !== b.cp) return a.cp > b.cp ? -1 : 1;
    if (a?.gain && b?.gain && a.gain !== b.gain) return a.gain > b.gain ? -1 : 1;
    if (a?.loss && b?.loss && a.loss !== b.loss) return a.loss > b.loss ? -1 : 1;

    return 0;
  });
  // console.log("Final evaluation:", evaluation);

  evaluation.forEach((pv, index) =>
    console.log(
      `info score ${pv.cp && !pv.mate ? `cp ${pv.cp}` : ""}${pv.mate ? `mate ${pv.mate}` : ""} pv ${pv.move} multipv ${
        index + 1
      } string sfpv ${sfInitialEval.findIndex((candidate) => candidate.move === pv.move) + 1} loss ${
        pv?.loss || "-"
      } gain ${pv?.gain || "-"} puregain ${pv?.puregain || "-"}`
    )
  );

  console.log(`bestmove ${evaluation[0].move}`);
}
