import { cleanExit } from "./engine";
import { analyse, printResults } from "./evaluate";
import { getValidCommand } from "./uci";
import { writeLine } from "./utils";

async function main() {
  let position = "startpos moves";

  for await (const chunk of Bun.stdin.stream()) {
    const line = Buffer.from(chunk).toString()
    const command = getValidCommand(line);

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
        const { evaluation } = await analyse(position, 2);
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
