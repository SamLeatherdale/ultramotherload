import { defineConfig } from "vite-plus";

export default defineConfig({
    server: {
        // Listen on every interface so other devices on the LAN can open the dev server.
        host: true,
    },
    fmt: {
        tabWidth: 4,
    },
    lint: {
        jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
        rules: { "vite-plus/prefer-vite-plus-imports": "error" },
        options: { typeAware: true, typeCheck: true },
    },
    staged: {
        "*": "vp check --fix",
    },
});
