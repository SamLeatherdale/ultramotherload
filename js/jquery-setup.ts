import $ from "jquery";

const g = globalThis as typeof globalThis & { $: typeof $; jQuery: typeof $ };
g.$ = $;
g.jQuery = $;

export default $;
