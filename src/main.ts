import { createInterface } from "readline";
import { cleanExit } from "./engine";
import { evaluate } from "./evaluate";
import { printUciResults } from "./uci";
import { getValidUciCommand } from "./uci";
import { writeLine } from "./utils";
import { createFishlikeEngine } from "./stockfish";
import { createLeelalikeEngine } from "./leela";
import { ENGINE_A_PATH, ENGINE_B_PATH, WEIGHTS_FILE_PATH } from "../config";

const shell = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

shell.on("close", cleanExit);

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
        cleanExit([engineA, engineB, movegen]);
      }
      default: // do nothing
    }
  });
}

main();
