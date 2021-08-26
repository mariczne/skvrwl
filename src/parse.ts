type MoveScore = {
  move: string;
  cp: number;
  mate?: number;
};

export function parseScoreLine(line: string): MoveScore | null {
  const matches = line.match(/^info depth.+score (?:cp|mate) (-?\d+).+pv ([a-z]\d[a-z]\d[a-z]?)/);

  if (!matches) return null;

  if (matches[0].includes("mate")) {
    const mateInMoves = Number(matches[1]);
    return {
      move: matches[2],
      mate: mateInMoves,
      cp: 12800 * (mateInMoves > 0 ? 1 : -1),
    };
  }

  return {
    move: matches[2],
    cp: Number(matches[1]),
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

  parsed.sort((a, b) => {
    if ("mate" in a && !("mate" in b)) return -1;
    if ("mate" in b && !("mate" in a)) return 1;
    if (a.mate && b.mate) return a.mate > b.mate ? -1 : 1;
    if ("cp" in a && "cp" in b) return a.cp > b.cp ? -1 : 1;
    return 0;
  });

  return parsed;
}

export function parseVMS(line: string) {}
