import { describe, expect, it } from "vite-plus/test";
import * as globals from "../js/globals";

describe("materials", () => {
    it("categorizes every defined material exactly once", () => {
        const categorized = Object.values(globals.MATERIAL_CATEGORIES).flatMap((cat) =>
            Object.keys(cat),
        );
        expect(new Set(categorized).size).toBe(categorized.length);
        expect(new Set(categorized)).toEqual(new Set(Object.keys(globals.materials)));
    });
});
