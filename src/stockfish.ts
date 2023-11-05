import { Engine, EngineOptions, createEngine } from "./engine";
import { parseScore } from "./parse";

export type FishlikeEngine = Engine<(position: string, depth: number) => Promise<ReturnType<typeof parseScore>>>;

export function createFishlikeEngine(path: string, options: EngineOptions): FishlikeEngine {
  return createEngine(
    path,
    (processHandler) => (position: string, depth: number): Promise<ReturnType<typeof parseScore>> => {
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
