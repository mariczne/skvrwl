import { ENGINE_A_PATH, ENGINE_B_PATH, WEIGHTS_FILE_PATH } from "../config";
import { Move, MoveScore, Policy, parsePolicy, parseScore } from "./parse";
import { spawnProcess } from "./process";

type EngineOptions = Partial<{
  args: string[];
  uci: Record<string, string | number | boolean>;
}>;

type Engine<T extends (position: string, ...args: any[]) => Promise<Move[]>> = {
  analyse: T;
  exit: () => void;
};

export function createEngine<T extends (position: string,...args: any[]) => Promise<Move[]>>(
  name: string,
  handleAnalysis: (processHandler: ReturnType<typeof spawnProcess>) => T,
  options?: EngineOptions
): Engine<T> {
  const processHandler = spawnProcess(name, options?.args);
  const analyse = handleAnalysis(processHandler);
  const exit = () => processHandler.process.kill();

  Object.entries(options?.uci ?? []).forEach(([name, value]) =>
    processHandler.send(`setoption name ${name} value ${value}\n`)
  );

  processHandler.send("ucinewgame");
  processHandler.send("position startpos");

  return {
    analyse,
    exit,
  };
}

type FishlikeEngine = Engine<(position: string, depth: number) => Promise<ReturnType<typeof parseScore>>>;

export function createFishlikeEngine(path: string, options: EngineOptions): FishlikeEngine {
  return createEngine(
    path,
    (processHandler) =>
      (position: string, depth: number): Promise<ReturnType<typeof parseScore>> => {
        return new Promise((resolve, _reject) => {
          let output = "";

          const listener = (chunk: unknown) => {
            output += String(chunk);

            if (String(chunk).includes("bestmove")) {
              processHandler.process.stdout.off("data", listener);

              const parsed = parseScore(output, depth);

              // clear UCI state before new analysis
              processHandler.send("ucinewgame");
              processHandler.send("position startpos");

              resolve(parsed);
            }
          };

          processHandler.process.stdout.on("data", listener);

          processHandler.send(`position ${position}`);
          processHandler.send(`go depth ${depth}`);
        });
      },
    options
  );
}

type LeelalikeEngine = Engine<(position: string) => Promise<ReturnType<typeof parsePolicy>>>;

export function createLeelalikeEngine(name: string, options?: EngineOptions): LeelalikeEngine {
  return createEngine(name, (processHandler) => (position: string): Promise<ReturnType<typeof parsePolicy>> => {
    return new Promise((resolve, _reject) => {
      let output = "";

      const listener = (chunk: unknown) => {
        output += String(chunk);

        if (String(chunk).includes("bestmove")) {
          processHandler.process.stdout.off("data", listener);

          const parsed = parsePolicy(output);
          resolve(parsed);
        }
      };

      processHandler.process.stdout.on("data", listener);

      processHandler.send(`position ${position}`);
      processHandler.send(`go nodes 1`);
    });
  }, options)
}

export const engineA = createFishlikeEngine(ENGINE_A_PATH, {
  uci: {
    Threads: 1,
  },
});

export const engineB = createLeelalikeEngine(ENGINE_B_PATH, {
  uci: {
    MultiPV: 500,
    Threads: 1,
    WeightsFile: WEIGHTS_FILE_PATH,
    VerboseMoveStats: true,
  },
});

export const movegen = createFishlikeEngine(ENGINE_A_PATH, {
  uci: {
    MultiPV: 500,
    Threads: 1,
  },
});

export function cleanExit() {
  [engineA, engineB].forEach((engine) => engine.exit());
  process.exit(0);
}
