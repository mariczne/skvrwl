import { Observable } from "rxjs";
import { Move } from "./parse";
import { spawnProcess } from "./process";

export type EngineOptions = Partial<{
  args: string[];
  uci: Record<string, string | number | boolean>;
}>;

export type Engine<T = (position: string, ...args: any[]) => Observable<Move[]>> = {
  analyse: T;
  exit: () => void;
};

export function createEngine<T = (position: string,...args: any[]) => Observable<Move[]>>(
  name: string,
  handleAnalysis: (processHandler: ReturnType<typeof spawnProcess>) => T,
  options?: EngineOptions
): Engine<T> {
  const processHandler = spawnProcess(name, options?.args);
  const analyse = handleAnalysis(processHandler);
  const exit = () => processHandler.process.kill();

  Object.entries(options?.uci ?? []).forEach(([name, value]) =>
    processHandler.send(`setoption name ${name} value ${value}\n`)
  );

  processHandler.send("ucinewgame");
  processHandler.send("position startpos");

  return {
    analyse,
    exit,
  };
}
