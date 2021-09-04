import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { shell } from "./main";
import { Position } from "./utils";
// import { getCurrentPOV, getScoreFromPOV } from "./utils";

// function createAborter() {
//   let isAborted = false;

//   const listenForStop = (line: string) => {
//     if (line.startsWith("stop")) {
//       isAborted = true;
//       shell.off("line", listenForStop);
//     }
//   };

//   shell.on("line", listenForStop);

//   return () => isAborted;
// }

export async function evaluate(position: string) {
  // process.stdin.on("data", (data) => {
  //   console.log("data", String(data));
  // });
  // const isAborted = createAborter();

  // if (isAborted()) return;
  [maia1200, stockfish].forEach((engine) => engine.send("ucinewgame"));

  const initialEval = await stockfish.analyse(position, 8);
  // console.log("info debug", { sfInitialEval });

  const safestMove = initialEval[0];

  const evaluation = [];

  for (const moveCandidate of initialEval) {
    try {
      if ("mate" in moveCandidate || "mate" in safestMove) {
        // forced mates
        evaluation.push(moveCandidate);
        continue;
      }

      const possibleLoss = safestMove.cp - moveCandidate.cp;

      const possibleResponses = await maia1200.analyse(Position(position, moveCandidate.move));
      if (!possibleResponses.length) continue;

      let mostPossibleResponses = possibleResponses.filter((response) => response.policy >= 20);
      if (!mostPossibleResponses.length) mostPossibleResponses = [possibleResponses[0]]; // no responses above 15%

      let trapEvaluation = [];
      let bestAnswerEval;

      // if (moveCandidate.move === "c5b6") console.log(moveCandidate.move, { mostPossibleResponses });
      // if (moveCandidate.move === "c5d6") console.log(moveCandidate.move, { mostPossibleResponses });

      const policiesSum = mostPossibleResponses.reduce((prev, curr) => prev + curr.policy, 0);
      mostPossibleResponses = mostPossibleResponses.map((response) => ({
        ...response,
        policy: (response.policy / policiesSum) * 100,
      }));

      for (const answer of mostPossibleResponses) {
        const answerEval = await stockfish.analyse(Position(position, moveCandidate.move, answer.move), 8);
        // if (moveCandidate.move === "c5b6") console.log(moveCandidate.move, answer.move, { eval: answerEval[0] });
        // if (moveCandidate.move === "c5d6") console.log(moveCandidate.move, answer.move, { eval: answerEval[0] });

        const FORCED_MATE_VALUE = 12800;

        const answerEvalCp = "cp" in answerEval[0] ? answerEval[0].cp : FORCED_MATE_VALUE;

        if (!bestAnswerEval || bestAnswerEval < answerEvalCp) bestAnswerEval = answerEvalCp;

        trapEvaluation.push({ cp: answerEvalCp, policy: answer.policy });
      }

      if (!trapEvaluation.length) continue;

      // console.log({trapEvaluation});

      const avgTrapEvaluation = Math.round(
        trapEvaluation.reduce(
          (prev, curr, index) => (curr.cp * (curr.policy / 100) + prev) / (index + 1),
          trapEvaluation[0].cp
        )
      );
      // console.log("info debug", { avgTrapEvaluation });

      // const possibleGain = bestAnswerEval ? bestAnswerEval - safestMove.cp : null; // this is wrong now

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
      // if trapEvaluation.cp     - safestMove.cp positive = these are the moves we look for
      // then we look at moveCandidate again

      evaluation.push({
        ...moveCandidate,
        cp: avgTrapEvaluation,
        // loss: possibleLoss,
        // gain: possibleGain,
        // puregain: possibleGain && Math.round(possibleGain - possibleLoss),
      });
    } catch (err) {
      console.error({ moveCandidate });
      appendFile(path.resolve("./errors.log"), `problem position: ${position}, move: ${moveCandidate.move}\n`);
    }
  }

  evaluation.sort((a, b) => {
    if ("mate" in a && "mate" in b) return a.mate < b.mate ? -1 : 1;
    if ("mate" in a && !("mate" in b)) return a.mate > 0 ? -1 : 1;
    if (!"mate in a" && "mate" in b) return b.mate > 0 ? 1 : -1;
    if ("cp" in a && "cp" in b) return a.cp > b.cp ? -1 : 1;
    // if (a.puregain && b.puregain && a.puregain !== b.puregain) return a.puregain > b.puregain ? -1 : 1;
    // if (a?.gain && b?.gain && a.gain !== b.gain) return a.gain > b.gain ? -1 : 1;
    // if (a?.loss && b?.loss && a.loss !== b.loss) return a.loss > b.loss ? -1 : 1;

    return 0;
  });
  // console.log("Final evaluation:", evaluation);

  evaluation.forEach((pv, index) =>
    console.log(
      `info score ${!("mate" in pv) ? `cp ${pv.cp}` : ""}${"mate" in pv ? `mate ${pv.mate}` : ""} pv ${
        pv.move
      } multipv ${index + 1} string sfpv ${pv.multipv}`
      //  loss ${pv?.loss ?? "-"} gain ${pv?.gain ?? "-"} puregain ${pv?.puregain ?? "-"}`
    )
  );

  console.log(`bestmove ${evaluation[0].move}`);
}
