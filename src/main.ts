import { createInterface } from "readline";
import { evaluate } from "./evaluate";
import { printUciResults } from "./uci";
import { getValidUciCommand } from "./uci";
import { writeLine } from "./utils";
import { createFishlikeEngine } from "./stockfish";
import { createLeelalikeEngine } from "./leela";
import { ENGINE_A_PATH, ENGINE_B_PATH, WEIGHTS_FILE_PATH } from "../config";
import { Engine } from "./engine";

const shell = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

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

const allEngines = [engineA, engineB, movegen]

export const cleanExit = (engines: Engine[]) => {
  engines.forEach((engine) => engine.exit());
  process.exit(0);
}

shell.on("close", () => cleanExit(allEngines));

async function main() {
  shell.prompt();

  let position = "startpos moves";

  shell.on("line", async (line) => {
    const command = getValidUciCommand(line);

    switch (command) {
      case "uci": {
        writeLine("id name skvrwl");
        writeLine("id author mariczne");
        writeLine("uciok");
        break;
      }
      case "isready": {
        writeLine("readyok");
        break;
      }
      case "position": {
        position = line.replace("position ", "");
        break;
      }
      case "go": {
        const evaluation = await evaluate(position, 2);
        printUciResults(evaluation, true);
        break;
      }
      case "quit": {
        cleanExit(allEngines)
      }
      default: // do nothing
    }
  });
}

main();
