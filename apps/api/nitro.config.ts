import { defineConfig } from "nitro";

export default defineConfig({
  preset: "vercel",
  modules: ["workflow/nitro"],
  alias: {
    "@": "./src",
  },
  routes: {
    "/**": "./src/index.ts",
  },
});
