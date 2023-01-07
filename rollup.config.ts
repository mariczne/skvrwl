import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import shebang from "rollup-plugin-add-shebang";
import type { RollupOptions } from "rollup";

const outFile = "./skurwiel";

const config: RollupOptions = {
  input: "./src/main.ts",
  output: {
    file: outFile,
    format: "cjs",
  },
  plugins: [resolve(), typescript({ module: "ES2020" }), terser({ ecma: 2020 }), shebang({ include: outFile })],
};

export default config;
