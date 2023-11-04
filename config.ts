export const ENGINE_A_PATH = "stockfish";
export const ENGINE_B_PATH = "lc0";
export const WEIGHTS_FILE_PATH = __dirname + "/weights/maia-1200.pb.gz"
export const MAX_NODE_SELECTION_THRESHOLD = 0.40;
export const CHANCE_NODE_SELECTION_THRESHOLD = 20;
export const DEBUG = process.env.DEBUG;
export const TEST_ENV = process.env.NODE_ENV === 'test';
