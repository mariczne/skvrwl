type PV = {
  move: string;
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
  const lines = output.split("\n");

  const parsed = lines
    .filter((line) => line.startsWith(`info depth ${finalDepth}`))
    .reduce((total, line) => {
      const parsedScoreLine = parseScoreLine(line);
      if (parsedScoreLine) return [...total, parsedScoreLine];
      return total;
    }, [] as MoveScore[]);

  parsed.sort((a, b) => (a.multipv < b.multipv ? -1 : 1));

  return parsed;
}

export function parsePolicy(output: string) {
  const lines = output.split("\n");

  const parsed = lines
    .filter((line) => line.startsWith("info string") && !line.startsWith("info string node"))
    .map((line) => {
      const matches = line.match(/^info string ([a-z]\d[a-z]\d[a-z]?).+P: ( ?\d?\d?\d.\d\d?)/);
      if (!matches) return null;
      return {
        move: matches[1],
        policy: Number(matches[2]),
      };
    })
    .filter((element): element is { move: string; policy: number } => !!element)
    .sort((a, b) => (a.policy > b.policy ? -1 : 1));

  return parsed;
}
