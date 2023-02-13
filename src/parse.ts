export type MoveScore =
  | {
      move: string;
      multipv: number;
      cp: number;
    }
  | {
      move: string;
      multipv: number;
      mate: number;
    };

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

// export function parseVMS(line: string) {}
