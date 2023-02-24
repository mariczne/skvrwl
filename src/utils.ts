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

export function convertQToCp(q: number) {
  return Math.round(111.714640912 * Math.tan(1.5620688421 * q));
}
