const COMMANDS = ["ucinewgame", "uci", "isready", "position", "go", "quit"] as const;

export function getValidCommand(line: string) {
  for (const command of COMMANDS) {
    if (line.startsWith(command)) return command;
  }

  return null;
}
