import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // Resolves the "@/*" alias straight from tsconfig.
  resolve: { tsconfigPaths: true },
  ssr: {
    // better-sqlite3 is a native module and must stay external to the bundle
    // or the .node binary goes missing at runtime.
    external: ["better-sqlite3"],
  },
});
