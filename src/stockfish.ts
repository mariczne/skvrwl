import { Observable, map, mergeMap, of, toArray } from "rxjs";
import { Engine, EngineOptions, createEngine } from "./engine";
import { MoveScore, parseScore } from "./parse";

export type FishlikeEngine = Engine<(position: string, depth: number) => Observable<MoveScore[]>>;

export function createFishlikeEngine(path: string, options: EngineOptions): FishlikeEngine {
  return createEngine(
    path,
    (processHandler) =>
      (position: string, depth: number): Observable<MoveScore[]> => {
        return new Observable((subscriber) => {
          const listener = (chunk: unknown) => {
            subscriber.next(chunk);

            if (String(chunk).includes("bestmove")) {
              subscriber.complete();
              processHandler.process.stdout.off("data", listener);

              // clear UCI state before new analysis
              processHandler.send("ucinewgame");
              processHandler.send("position startpos");
            }
          };

          processHandler.process.stdout.on("data", listener);

          processHandler.send(`position ${position}`);
          processHandler.send(`go depth ${depth}`);
        }).pipe(
          mergeMap((chunk) => parseScore(String(chunk), depth)),
          toArray()
        );
      },
    options
  );
}
