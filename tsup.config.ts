import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts", next: "src/next.ts" },
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  external: ["next", "next/server", "next/headers"],
});
