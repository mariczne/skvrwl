import { appendFile } from "fs/promises";
import path from "path";
import { maia, stockfish } from "./engine";
import { shell } from "./main";
// import { getCurrentPOV, getScoreFromPOV } from "./utils";

function createAborter() {
  let isAborted = false;

  const listenForStop = (line: string) => {
    if (line.startsWith("stop")) {
      isAborted = true;
      shell.off("line", listenForStop);
    }
  };

  shell.on("line", listenForStop);

  return () => isAborted;
}

export async function evaluate(position: string) {
  // process.stdin.on("data", (data) => {
  //   console.log("data", String(data));
  // });
  // const isAborted = createAborter();

  // if (isAborted()) return;

  const sfInitialEval = await stockfish.analyse(position, 6);
  const safestMove = sfInitialEval[0];

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

      const possibleResponses = await maia.analyse(
        `${position}${!position.includes("moves") ? " moves" : ""} ${moveCandidate.move}`
      );

      const mostPossibleResponses = possibleResponses.filter((response) => response.policy >= 10);
      if (!mostPossibleResponses.length) continue;
      let trapEvaluation = [];

      for (const answer of mostPossibleResponses) {
        const answerEval = await stockfish.analyse(
          `${position}${!position.includes("moves") ? " moves" : ""} ${moveCandidate.move} ${answer.move}`,
          4
        );

        trapEvaluation.push({ cp: answerEval[0].cp, policy: answer.policy });
      }

      if (!trapEvaluation.length) continue;

      // console.log({trapEvaluation});
      

      const avgTrapEvaluation = trapEvaluation.reduce(
        (prev, curr, index) => (curr.cp * (curr.policy / 100) + prev) / (index + 1),
        trapEvaluation[0].cp
      );

      const possibleGain = avgTrapEvaluation - safestMove.cp; // this is wrong now

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
        cp: Number(avgTrapEvaluation.toFixed(0)),
        loss: Number(possibleLoss.toFixed(0)),
        gain: Number(possibleGain.toFixed(0)),
        puregain: Number((possibleGain - possibleLoss).toFixed(0)),
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
    if (a.cp !== b.cp) return a.cp > b.cp ? -1 : 1;
    if (a.puregain && b.puregain && a.puregain !== b.puregain) return a.puregain > b.puregain ? -1 : 1;
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
