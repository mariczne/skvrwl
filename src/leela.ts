import { Engine, EngineOptions, createEngine } from "./engine";
import { parsePolicy } from "./parse";

export type LeelalikeEngine = Engine<(position: string) => Promise<ReturnType<typeof parsePolicy>>>;

export function createLeelalikeEngine(name: string, options?: EngineOptions): LeelalikeEngine {
  return createEngine(name, (processHandler) => (position: string): Promise<ReturnType<typeof parsePolicy>> => {
    return new Promise((resolve, _reject) => {
      let output = "";

      const listener = (chunk: unknown) => {
        output += String(chunk);

        if (String(chunk).includes("bestmove")) {
          processHandler.process.stdout.off("data", listener);

          const parsed = parsePolicy(output);
          resolve(parsed);
        }
      };

      processHandler.process.stdout.on("data", listener);

      processHandler.send(`position ${position}`);
      processHandler.send(`go nodes 1`);
    });
  }, options);
}
