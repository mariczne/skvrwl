import { DEBUG } from "../config";

function getCurrentTimestamp() {
  return new Date().toISOString();
}

export const Logger = {
  log: (...messages: any[]) => console.log("[LOG]", `[${getCurrentTimestamp()}]`, ...messages),
  error: (...messages: any[]) => console.error("[ERROR]", `[${getCurrentTimestamp()}]`, ...messages),
  debug: (...messages: any[]) => DEBUG ? console.debug("[DEBUG]", `[${getCurrentTimestamp()}]`, ...messages) : undefined,
};
