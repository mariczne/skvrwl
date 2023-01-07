import { createInterface } from "readline";
import { stockfish } from "./engine";
import { evaluate } from "./evaluate";

export const shell = createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "",
});

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
        evaluate(position);
      } else if (line.startsWith("go")) {
        evaluate(position);
      } else if (line.startsWith("quit")) {
        process.exit(0);
      }
      shell.prompt();
    })
    .on("close", () => {
      console.log("exiting...");
      process.exit(0);
    });
}

main();
