import type { Config } from "@react-router/dev/config";

export default {
  // Keeps the existing src/ layout rather than moving everything to app/.
  appDirectory: "src",
  // Every page reads SQLite at request time, so it all renders on the server.
  ssr: true,
} satisfies Config;
