export type Move = {
  move: string;
};

type PV = Move & {
  multipv: number;
};

export type CpScorePV = PV & { cp: number };
export type MateScorePV = PV & { mate: number };

export type MoveScore = CpScorePV | MateScorePV;

export function parseScoreLine(line: string): MoveScore | null {
  const matches = line.match(/^.+multipv (\d+) score (?:cp|mate) (-?\d+).+pv ([a-z]\d[a-z]\d[a-z]?)/);

  if (!matches) return null;

  if (matches[0].includes("mate")) {
    return {
      move: matches[3],
      multipv: Number(matches[1]),
      mate: Number(matches[2]),
    };
  }

  return {
    move: matches[3],
    multipv: Number(matches[1]),
    cp: Number(matches[2]),
  };
}

export function parseScore(output: string, finalDepth: number) {
  return output
    .split("\n")
    .reduce((total, line) => {
      if (!line.startsWith(`info depth ${finalDepth}`)) return total;

      const parsedScoreLine = parseScoreLine(line);
      return parsedScoreLine ? [...total, parsedScoreLine] : total;
    }, [] as MoveScore[])
    .toSorted((a, b) => (a.multipv < b.multipv ? -1 : 1));
}

export type Policy = Move & {
  policy: number;
};

export function parsePolicy(output: string) {
  return output
    .split("\n")
    .reduce((total, line) => {
      if (!(line.startsWith("info string") && !line.startsWith("info string node"))) return total

      const matches = line.match(/^info string ([a-z]\d[a-z]\d[a-z]?).+P: ( ?\d?\d?\d.\d\d?)/) || [];
      if (!matches) return total;

      return [...total, {
        move: matches[1],
        policy: Number(matches[2]),
      }];
    }, [] as Policy[])
    .toSorted((a, b) => (a.policy > b.policy ? -1 : 1));
}
