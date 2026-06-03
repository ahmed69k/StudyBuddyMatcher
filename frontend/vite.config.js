import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  preview: {
    allowedHosts: ["frontend-production-9318.up.railway.app"],
    host: "0.0.0.0",
  },
});