import { spawn } from "child_process";
import path from "path";
import { parseScore } from "./parse";

export type EngineOptions = Partial<{
  arguments: string[];
  uci: Record<string, string | number | boolean>;
}>;

export function Engine(name: string, options?: EngineOptions) {
  const engineProcess = spawn(name, options?.arguments);

  // engineProcess.stdout.on("data", (data) => {
  //   console.log(`\n${engineProcess.spawnfile} stdout: ${data}`);
  // });

  // engineProcess.stderr.on("data", (data) => {
  //   console.error(`\n${engineProcess.spawnfile} stderr: ${data}`);
  // });

  engineProcess.on("close", (code) => {
    console.log(`\n${engineProcess.spawnfile} exited with code ${code}`);
  });

  const send = (command: string) => {
    engineProcess.stdin.write(`${command}\n`);
  };

  const analyse = (position: string, depth: number): Promise<ReturnType<typeof parseScore>> => {
    return new Promise((resolve, _reject) => {
      let output = "";

      const listener = (chunk: unknown) => {
        output += String(chunk);

        if (String(chunk).includes("bestmove")) {
          engineProcess.stdout.off("data", listener);

          const parsed = parseScore(output, depth);
          resolve(parsed);
        }
      };

      engineProcess.stdout.on("data", listener);

      send(`position ${position}`);
      send(`go depth ${depth}`);
    });
  };

  if (options?.uci) {
    for (const [name, value] of Object.entries(options.uci)) {
      send(`setoption name ${name} value ${value}\n`);
    }
  }

  send("ucinewgame");
  send("position startpos");

  return {
    send,
    analyse,
    engineProcess,
  };
}

export function AuxiliaryEngine(name: string, options?: EngineOptions) {
  const engine = Engine(name, options);

  const analyse = (position: string): Promise<{ move: string; policy: number }[]> => {
    return new Promise((resolve, _reject) => {
      let output = "";

      const listener = (chunk: unknown) => {
        output += String(chunk);

        if (String(chunk).includes("bestmove")) {
          engine.engineProcess.stdout.off("data", listener);

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

          resolve(parsed);
        }
      };

      engine.engineProcess.stdout.on("data", listener);

      engine.send(`position ${position}`);
      engine.send(`go nodes 1`);
    });
  };

  return { ...engine, analyse };
}

const COMMON_UCI = { MultiPV: 500 };

export const stockfish = Engine("stockfish", { uci: { ...COMMON_UCI, Threads: 8, UCI_Chess960: true } });
export const maia = AuxiliaryEngine("lc0", {
  uci: {
    ...COMMON_UCI,
    Threads: 2,
    // WeightsFile: path.resolve("../../maia-chess/maia_weights/maia-1200.pb.gz"),
    WeightsFile: path.resolve("/home/marcin/Downloads/chess/maia-chess/maia_weights/maia-1200.pb.gz"),
    VerboseMoveStats: true,
    Backend: "eigen",
  },
});
