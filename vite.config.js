import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base — путь, по которому приложение живёт на GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: "/budget-tracker/",
  build: { outDir: "dist" },
});
