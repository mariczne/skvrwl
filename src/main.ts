import { createInterface } from "readline";
import { cleanExit } from "./engine";
import { evaluate } from "./evaluate";
import { printUciResults } from "./uci";
import { getValidUciCommand } from "./uci";
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
        cleanExit();
      }
      default: // do nothing
    }
  });
}

main();
