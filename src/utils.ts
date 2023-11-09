import { MateScorePV, MoveScore } from "./parse";

export type MoveScoreQ = MoveScore & { q: number };
export type MoveScoreQOnly = Omit<MoveScoreQ, "cp">;

export function createPosition(fen: string, ...moves: string[]) {
  let newPosition = fen;
  if (moves && !fen.includes("moves")) newPosition += " moves";
  for (const move of moves) {
    newPosition += ` ${move}`;
  }
  return newPosition;
}

export function roundToTwoDecimals(num: number) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function convertCpToWinPctg(cp: number) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function convertCpToQ(cp: number) {
  const winPctg = convertCpToWinPctg(cp);
  return ((winPctg / 100) * 2) / 1 + -1;
}

export function isMateScore(moveScore: MoveScore | MoveScoreQOnly): moveScore is MateScorePV {
  return "mate" in moveScore;
}

export function convertScoreToQ(moveScore: MoveScore) {
  if (isMateScore(moveScore)) return convertMateScoreToQ(moveScore);
  return convertCpToQ(moveScore.cp);
}

export function convertMateScoreToQ(mateScore: MateScorePV) {
  return mateScore.mate > 0 ? 1 : -1;
}

export function convertQToCp(q: number) {
  return Math.round(111.714640912 * Math.tan(1.5620688421 * q));
}

export function replaceMoveScoreCpWithQ(moveScore: MoveScore): MoveScoreQOnly {
  if (isMateScore(moveScore)) {
    return { ...moveScore, q: convertScoreToQ(moveScore) };
  }

  const { cp, ...scoreWithoutCp } = moveScore;

  return {
    ...scoreWithoutCp,
    q: convertScoreToQ(moveScore),
  };
}

export function mapMoveScoreQToCp(moveScoreQ: MoveScoreQOnly) {
  return { ...moveScoreQ, cp: convertQToCp(moveScoreQ.q) };
}

export function writeLine(line: string) {
  process.stdout.write(line + "\n");
}

export function sortByQDescending(a: {q: number}, b: {q: number}) {
  return a.q > b.q ? -1 : 1;
}

export function sumBy<T>(collection: T[], elementToNumber: (element: T) => number) {
  return collection.reduce((acc, curr) => acc + elementToNumber(curr), 0)
}
