import path from "path";

export const ENGINE_A_PATH = "stockfish";
export const ENGINE_B_PATH = "lc0";
export const WEIGHTS_FILE_PATH = path.resolve(".", "weights", "maia-1200.pb.gz");
export const MAX_NODE_SELECTION_THRESHOLD = 0.4;
export const CHANCE_NODE_SELECTION_THRESHOLD = 15;
