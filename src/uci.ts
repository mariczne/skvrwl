import { MoveScoreQ, writeLine, roundToTwoDecimals } from "./utils";

const COMMANDS = ["ucinewgame", "uci", "isready", "position", "go", "quit"] as const;

export function getValidUciCommand(line: string) {
  for (const command of COMMANDS) {
    if (line.startsWith(command)) return command;
  }

  return null;
}
export function printUciResults(evaluation: MoveScoreQ[], final = false): void {
  evaluation.forEach((pv, index) => writeLine(
    `info multipv ${index + 1} score` +
    (!("mate" in pv) ? ` cp ${pv.cp} q ${roundToTwoDecimals(pv.q)}` : "") +
    ` pv ${pv.move} string sfpv ${pv.multipv}`
  )
  );

  if (final) writeLine(`bestmove ${evaluation[0].move}`);
}
