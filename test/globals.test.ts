import { describe, expect, it } from "vite-plus/test";
import * as globals from "../js/globals";

describe("map sections", () => {
    it("covers every row once, with a black sky above the surface", () => {
        const sections = globals.mapSections();
        expect(sections.map((section) => section.label)).toEqual([
            "Top",
            "Surface",
            "Alpha",
            "Beta",
            "Gamma",
            "Delta",
            "Boss",
        ]);
        expect(sections[0]).toMatchObject({ startRow: 0, color: "#000000" });
        for (let i = 0; i < sections.length - 1; i++) {
            expect(sections[i].endRow + 1).toBe(sections[i + 1].startRow);
        }
        expect(sections[sections.length - 1].endRow).toBe(globals.MAP_ROWS - 1);
    });
});

describe("materials", () => {
    it("categorizes every defined material exactly once", () => {
        const categorized = Object.values(globals.MATERIAL_CATEGORIES).flatMap((cat) =>
            Object.keys(cat),
        );
        expect(new Set(categorized).size).toBe(categorized.length);
        expect(new Set(categorized)).toEqual(new Set(Object.keys(globals.materials)));
    });
});
