import { createInterface } from "readline";
import { cleanExit } from "./engine";
import { analyse, printResults } from "./evaluate";
import { getValidCommand } from "./uci";
import { writeLine } from "./utils";

const shell = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

shell.on("close", cleanExit);

async function main() {
  shell.prompt();

  let position = "startpos moves";

  for await (const line of shell) {
    const command = getValidCommand(line);

    switch (command) {
      case "uci": {
        writeLine("id name skurwiel");
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
        const { evaluation } = await analyse(position, 3);
        printResults(evaluation, true);
        break;
      }
      case "quit": {
        cleanExit();
      }
      default: // do nothing
    }
  }
}

main();
