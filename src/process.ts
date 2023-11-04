import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { DEBUG, TEST_ENV } from "../config";
import { Logger } from "./log";

type ProcessHandler = {
  process: ChildProcessWithoutNullStreams;
  send: (command: string) => void;
};

export function spawnProcess(name: string, args: string[] = []): ProcessHandler {
  const process = spawn(name, args);

  if (!TEST_ENV) {
    if (DEBUG) {
      process.stdout.on("data", (data) => {
        Logger.log(`\n${process.spawnfile} stdout: ${data}`);
      });
      process.stderr.on("data", (data) => {
        Logger.error(`\n${process.spawnfile} stderr: ${data}`);
      });
    }

    process.on("close", (code) => {
      Logger.log(`\n${process.spawnfile} exited with code ${code}`);
    });
  }

  const send = (command: string) => {
    process.stdin.write(`${command}\n`);
  };

  return {
    process,
    send
  };
}
