import { spawn } from "child_process";
import { DEBUG, ENGINE_A_PATH, ENGINE_B_PATH, TEST_ENV, WEIGHTS_FILE_PATH } from "../config";
import { parsePolicy, parseScore } from "./parse";
import { Logger } from "./log";

export type EngineOptions = Partial<{
  arguments: string[];
  uci: Record<string, string | number | boolean>;
}>;

export function createEngine(name: string, options?: EngineOptions) {
  const engineProcess = spawn(name, options?.arguments);

  if (!TEST_ENV) {
    if (DEBUG) {
      engineProcess.stdout.on("data", (data) => {
        Logger.log(`\n${engineProcess.spawnfile} stdout: ${data}`);
      });
      engineProcess.stderr.on("data", (data) => {
        Logger.error(`\n${engineProcess.spawnfile} stderr: ${data}`);
      });
    }

    engineProcess.on("close", (code) => {
      Logger.log(`\n${engineProcess.spawnfile} exited with code ${code}`);
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

          // clear UCI state before new analysis
          send("ucinewgame");
          send("position startpos");

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

  const analyse = (position: string): Promise<ReturnType<typeof parsePolicy>> => {
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

export const engineA = createEngine(ENGINE_A_PATH, {
  uci: {
    Threads: 1,
  },
});

export const engineB = createAuxiliaryEngine(ENGINE_B_PATH, {
  uci: {
    MultiPV: 500,
    Threads: 1,
    WeightsFile: WEIGHTS_FILE_PATH,
    VerboseMoveStats: true,
  },
});

export const movegen = createEngine(ENGINE_A_PATH, {
  uci: {
    MultiPV: 500,
    Threads: 1,
  },
});

export function cleanExit() {
  [engineA, engineB].forEach((engine) => engine.engineProcess.kill());
  process.exit(0);
}
