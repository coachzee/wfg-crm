import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
import { visualizer } from "rollup-plugin-visualizer";

// Only include visualizer in build mode when ANALYZE env is set
const plugins = [
  react(),
  tailwindcss(),
  jsxLocPlugin(),
  vitePluginManusRuntime(),
];

// Add visualizer plugin when ANALYZE=true
if (process.env.ANALYZE === "true") {
  plugins.push(
    visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // Options: treemap, sunburst, network
    }) as any
  );
}

export default defineConfig({
  base: "./",
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Enable chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core - must load first
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // tRPC client - separate chunk for API layer
          if (id.includes('@trpc/client') || id.includes('@trpc/react-query') || id.includes('@tanstack/react-query')) {
            return 'vendor-trpc';
          }
          // UI components - used across many pages
          if (id.includes('@radix-ui/') || id.includes('lucide-react')) {
            return 'vendor-ui';
          }
          // Date utilities
          if (id.includes('date-fns')) {
            return 'vendor-date';
          }
          // Other utilities (excluding clsx which is shared by recharts)
          if (id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'vendor-utils';
          }
          // Wouter router
          if (id.includes('wouter')) {
            return 'vendor-router';
          }
          // NOTE: recharts, d3-*, victory-vendor, lodash, clsx are intentionally
          // NOT split into a separate vendor-charts chunk. Doing so causes a
          // circular dependency where vendor-charts executes S.forwardRef()
          // at module top-level before vendor-react (which exports S/React)
          // has finished initializing, resulting in:
          //   "Uncaught ReferenceError: Cannot access 'S' before initialization"
        },
      },
    },
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1",
    ],
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
