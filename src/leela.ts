import { Observable, mergeMap, toArray } from "rxjs";
import { Engine, EngineOptions, createEngine } from "./engine";
import { Policy, parsePolicy } from "./parse";

export type LeelalikeEngine = Engine<(position: string) => Observable<Policy[]>>;

export function createLeelalikeEngine(name: string, options?: EngineOptions): LeelalikeEngine {
  return createEngine(
    name,
    (processHandler) =>
      (position: string): Observable<Policy[]> => {
        return new Observable((subscriber) => {
          const listener = (chunk: unknown) => {
            subscriber.next(chunk);

            if (String(chunk).includes("bestmove")) {
              subscriber.complete();
              processHandler.process.stdout.off("data", listener);
            }
          };

          processHandler.process.stdout.on("data", listener);

          processHandler.send(`position ${position}`);
          processHandler.send(`go nodes 1`);
        }).pipe(
          mergeMap((chunk) => parsePolicy(String(chunk))),
          toArray()
        );
      },
    options
  );
}
