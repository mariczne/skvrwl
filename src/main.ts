import { createInterface } from "readline";
import { stockfish, maia1200 } from "./engine";
import { analyse, evaluate, logResults } from "./evaluate";

export const shell = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

function cleanExit() {
  console.log("exiting...");
  [stockfish, maia1200].forEach(engine => engine.engineProcess.kill())
  process.exit(0);
}

async function main() {
  shell.prompt();

  let position = "startpos moves";

  shell
    .on("line", async (line) => {
      if (line === "uci") {
        process.stdout.write("id name skurwiel\n");
        process.stdout.write("id author mariczne\n");
        process.stdout.write("uciok\n");
        // process.stdout.write("readyok\n");
      } else if (line === "isready") {
        process.stdout.write("readyok\n");
      } else if (line === "d") {
        stockfish.send("d");
      } else if (line.startsWith("position")) {
        position = line.replace("position ", "");
      } else if (line.startsWith("#")) {
        position += line.replace("#", " ");
        const data = await analyse(position, 6);
        if (data.evaluation?.length) logResults(data.evaluation, 6)
      } else if (line.startsWith("go")) {
        const data = await analyse(position, 6);
        if (data.evaluation?.length) logResults(data.evaluation, 6)
      } else if (line.startsWith("quit")) {
        process.exit(0);
      }
      shell.prompt();
    })
    .on("close", cleanExit)
}

// process.on("SIGKILL", cleanExit)
// process.on("SIGTERM", cleanExit)

main();
