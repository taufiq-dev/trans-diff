import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
// CodeMirror breaks silently (styles ignored, "multiple instances of
// @codemirror/state") if any of its packages resolve to two copies, so force a
// single instance and pre-bundle them together.
const codemirrorPackages = [
	"@codemirror/language",
	"@codemirror/state",
	"@codemirror/view",
	"@lezer/highlight",
];

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: codemirrorPackages,
	},
	optimizeDeps: {
		include: ["codemirror", "@codemirror/lang-json", ...codemirrorPackages],
	},
});
