import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import type { RollupOptions } from "rollup";

const config: RollupOptions = {
  input: "./src/main.ts",
  output: {
    format: "cjs",
    name: "main",
    file: "./build/bundle.js",
    // sourcemap: !production,
  },
  plugins: [
    resolve(),

    typescript({
      // sourceMap: !production,
      // inlineSources: !production
    }),

    terser(),

    // !production && serve(),

    // !production && watchExternal(),

    // !production && livereload(),
  ],
  watch: {
    clearScreen: false,
  },
};

export default config;
