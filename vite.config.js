import { defineConfig } from "vite";

// Builds one self-contained file, dist/replybek-widget.js, plus the demo page from public/.
export default defineConfig({
  build: {
    lib: { entry: "src/widget.js", name: "ReplybekWidget", formats: ["iife"], fileName: () => "replybek-widget.js" },
    target: "es2018",
  },
  preview: { port: 5174 },
});
