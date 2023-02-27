import { spawn } from "child_process";
import { ENGINE_A_PATH, ENGINE_B_PATH, WEIGHTS_FILE_PATH } from "../config";
import { parsePolicy, parseScore } from "./parse";

export type EngineOptions = Partial<{
  arguments: string[];
  uci: Record<string, string | number | boolean>;
  debug: ["stdout"?, "stderr"?];
}>;

export function createEngine(name: string, options?: EngineOptions) {
  const engineProcess = spawn(name, options?.arguments);

  if (process.env.NODE_ENV !== "test") {
    if (options?.debug?.includes("stdout")) {
      engineProcess.stdout.on("data", (data) => {
        console.log(`\n${engineProcess.spawnfile} stdout: ${data}`);
      });
    }

    if (options?.debug?.includes("stderr")) {
      engineProcess.stderr.on("data", (data) => {
        console.error(`\n${engineProcess.spawnfile} stderr: ${data}`);
      });
    }

    engineProcess.on("close", (code) => {
      console.log(`\n${engineProcess.spawnfile} exited with code ${code}`);
    });
  }

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

export function createAuxiliaryEngine(name: string, options?: EngineOptions) {
  const engine = createEngine(name, options);

  const analyse = (position: string): Promise<{ move: string; policy: number }[]> => {
    return new Promise((resolve, _reject) => {
      let output = "";

      const listener = (chunk: unknown) => {
        output += String(chunk);

        if (String(chunk).includes("bestmove")) {
          engine.engineProcess.stdout.off("data", listener);

          const parsed = parsePolicy(output);
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

export const engineA = createEngine(ENGINE_A_PATH, {
  uci: {
    ...COMMON_UCI,
    Threads: 1,
  },
});

export const engineB = createAuxiliaryEngine(ENGINE_B_PATH, {
  uci: {
    ...COMMON_UCI,
    Threads: 1,
    WeightsFile: WEIGHTS_FILE_PATH,
    VerboseMoveStats: true,
  },
});

export function cleanExit() {
  [engineA, engineB].forEach((engine) => engine.engineProcess.kill());
  process.exit(0);
}
