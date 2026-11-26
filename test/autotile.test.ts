import { describe, expect, it } from "vite-plus/test";
import { getCellSpriteKey } from "../js/autotile";
import { Cell } from "../js/cell";

describe("getCellSpriteKey", () => {
    it("resolves regular and top-edge tunnel autotile shapes from neighbors", () => {
        const makeGrid = (codes: number[][]): Cell[][] =>
            codes.map((row, r) => row.map((code, c) => new Cell(code, 0, r, c)));

        // Isolated 1x1 tunnel surrounded by dirt -> T259_0
        const pocket = makeGrid([
            [0x10, 0x10, 0x10],
            [0x10, 0x01, 0x10],
            [0x10, 0x10, 0x10],
        ]);
        expect(getCellSpriteKey(pocket, pocket[1][1])).toBe("T259_0");

        // Vertical shaft (solid E & W, open N & S) -> T274_0
        const shaft = makeGrid([
            [0x10, 0x01, 0x10],
            [0x10, 0x01, 0x10],
            [0x10, 0x01, 0x10],
        ]);
        expect(getCellSpriteKey(shaft, shaft[1][1])).toBe("T274_0");

        // Horizontal corridor (solid N & S, open E & W) -> T258_0
        const corridor = makeGrid([
            [0x10, 0x10, 0x10],
            [0x01, 0x01, 0x01],
            [0x10, 0x10, 0x10],
        ]);
        expect(getCellSpriteKey(corridor, corridor[1][1])).toBe("T258_0");

        // Top-edge shaft (solid E & W, open S) -> E387_0
        const topShaft = makeGrid([
            [0xff, 0xff, 0xff],
            [0x11, 0x02, 0x11],
            [0x10, 0x01, 0x10],
        ]);
        expect(getCellSpriteKey(topShaft, topShaft[1][1])).toBe("E387_0");
    });
});
