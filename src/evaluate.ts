import { appendFile } from "fs/promises";
import path from "path";
import { maia1200, stockfish } from "./engine";
import { Position } from "./utils";

function convertCpToWinPctg(cp: number) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

function convertCpToQ(cp: number) {
  const winPctg = convertCpToWinPctg(cp);

  return ((winPctg / 100) * 2) / 1 + -1;
}

function convertQToCp(q: number) {
  return 111.714640912 * Math.tan(1.5620688421 * q);
}

export async function evaluate(position: string) {
  [maia1200, stockfish].forEach((engine) => engine.send("ucinewgame"));

  const initialEval = await stockfish.analyse(position, 6);

  const safestMove = initialEval[0];

  if ("mate" in safestMove) {
    console.log(`bestmove ${safestMove.move}`);
    return;
  }

  const evaluation = [];

  const candidateMoves = initialEval.filter((move) => "cp" in move && safestMove.cp - move.cp < 250);

  console.log({ candidateMoves });

  for (const moveCandidate of candidateMoves) {
    try {
      // forced mates
      if ("mate" in moveCandidate || "mate" in safestMove) {
        evaluation.push(moveCandidate);
        continue;
      }

      // const possibleLoss = safestMove.cp - moveCandidate.cp;

      const possibleResponses = await maia1200.analyse(Position(position, moveCandidate.move));
      if (!possibleResponses.length) continue;

      let mostPossibleResponses = possibleResponses.filter((response) => response.policy >= 25);
      if (!mostPossibleResponses.length) mostPossibleResponses = [possibleResponses[0]]; // no responses above threshold

      let trapEvaluation = [];

      const policiesSum = mostPossibleResponses.reduce((prev, curr) => prev + curr.policy, 0);

      mostPossibleResponses = mostPossibleResponses.map((response) => ({
        ...response,
        policy: response.policy / policiesSum,
      }));

      for (const answer of mostPossibleResponses) {
        const answerEval = await stockfish.analyse(Position(position, moveCandidate.move, answer.move), 6);
        const FORCED_MATE_VALUE = 12800;
        const answerEvalCp = "cp" in answerEval[0] ? answerEval[0].cp : FORCED_MATE_VALUE;
        // const winpct = convertCpToWinPctg(answerEvalCp)
        const trapQ = answer.policy * convertCpToQ(answerEvalCp);
        const trapscore = convertQToCp(trapQ);
        console.log(answer.move, { cp: answerEvalCp, policy: answer.policy, trapscore, trapQ });

        trapEvaluation.push({
          move: answer.move,
          cp: answerEvalCp,
          policy: answer.policy,
          trapscore,
        });
      }

      // console.log(trapEvaluation);
      if (!trapEvaluation.length) continue;

      // const avgTrapEvaluation = Math.round(
      //   trapEvaluation.reduce(
      //     (prev, curr, index) => (curr.cp * (curr.policy / 100) + prev) / (index + 1),
      //     trapEvaluation[0].cp
      //   )
      // );
      const bestTrapEvaluation = Math.round(
        trapEvaluation.reduce((max, currentEval) => Math.max(max, currentEval.trapscore), trapEvaluation[0].trapscore)
      );

      // console.log(123, evaluation);

      evaluation.push({
        ...moveCandidate,
        cp: bestTrapEvaluation,
      });
    } catch (err) {
      console.error({ moveCandidate });
      appendFile(path.resolve("./errors.log"), `problem position: ${position}, move: ${moveCandidate.move}\n`);
    }
  }

  evaluation.sort((a, b) => {
    if ("mate" in a && "mate" in b) return a.mate < b.mate ? -1 : 1;
    if ("mate" in a && !("mate" in b)) return a.mate > 0 ? -1 : 1;
    if (!("mate" in a) && "mate" in b) return b.mate > 0 ? 1 : -1;
    // if ("trapscore" in a && "trapscore" in b) return a.trapscore < b.trapscore ? -1 : 1;
    // if ("trapscore" in a && !("trapscore" in b)) return a.trapscore > 0 ? -1 : 1;
    // if (!("trapscore" in a) && "trapscore" in b) return b.trapscore > 0 ? 1 : -1;
    if ("cp" in a && "cp" in b) return a.cp > b.cp ? -1 : 1;

    return 0;
  });

  evaluation.forEach((pv, index) =>
    console.log(
      "info score" +
        (!("mate" in pv) ? ` cp ${pv.cp}` : "") +
        ("mate" in pv ? ` mate ${pv.mate}` : "") +
        ` pv ${pv.move} multipv ${index + 1}` +
        ` string sfpv ${pv.multipv}`
      // + ` string trapscore ${pv.trapscore}`
    )
  );

  console.log(`bestmove ${evaluation[0].move}`);
}
