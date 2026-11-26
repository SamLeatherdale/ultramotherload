import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import * as globals from "../js/globals";
import { parseMapBuffer } from "../js/io";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const sampleMapPath = path.resolve(import.meta.dirname, "../res/sample_map.bin");

function loadSampleMap() {
    const inputBytes = fs.readFileSync(sampleMapPath);
    return parseMapBuffer(toArrayBuffer(inputBytes)).map;
}

describe("Cell", () => {
    beforeEach(() => {
        globals.state.safe_mode = true;
        globals.state.last_selected = undefined;
    });

    it("updates unlocked tiles and ignores locked marker and outpost tiles in safe mode", () => {
        const map = loadSampleMap();

        // Unlocked ground tile just below the surface
        const editableCell = map[globals.ROWS_ABOVE_SURFACE][1];
        expect(editableCell.isLocked()).toBe(false);
        editableCell.updateCode("58"); // Diamond
        expect(editableCell.code).toBe("58");
        expect(editableCell.modified).toBe(true);

        // Locked marker column should ignore edits
        const markerCell = map[globals.ROWS_ABOVE_SURFACE][0];
        expect(markerCell.code).toBe("FD");
        expect(markerCell.isLocked()).toBe(true);
        markerCell.updateCode("58");
        expect(markerCell.code).toBe("FD");

        // Outpost tile is locked in safe mode
        const outpostCell = map[446][10];
        expect(outpostCell.is_outpost).toBe(true);
        expect(outpostCell.isLocked()).toBe(true);
        const originalOutpostCode = outpostCell.code;
        outpostCell.updateCode("58");
        expect(outpostCell.code).toBe(originalOutpostCode);
    });

    it("keeps the outer perimeter locked and accepts experimental codes when safe mode is off", () => {
        const map = loadSampleMap();

        globals.state.safe_mode = false;
        // Outer FD perimeter (cols 0/37 and row 0) remains locked even with Safe Mode off;
        // bottom void row 1501 (FF) unlocks when Safe Mode is off.
        expect(map[globals.ROWS_ABOVE_SURFACE][0].isLocked()).toBe(true);
        expect(map[globals.ROWS_ABOVE_SURFACE][globals.COLS_PER_ROW - 1].isLocked()).toBe(true);
        expect(map[0][1].isLocked()).toBe(true);
        expect(map[globals.MAP_ROWS - 1][1].isLocked()).toBe(false);

        map[globals.ROWS_ABOVE_SURFACE][1].updateCode("12");
        map[globals.ROWS_ABOVE_SURFACE][2].updateCode("25");
        map[globals.ROWS_ABOVE_SURFACE][3].updateCode("2A");
        map[globals.ROWS_ABOVE_SURFACE][4].updateCode("FD");

        expect(map[globals.ROWS_ABOVE_SURFACE][1].code).toBe("12");
        expect(map[globals.ROWS_ABOVE_SURFACE][2].code).toBe("25");
        expect(map[globals.ROWS_ABOVE_SURFACE][3].code).toBe("2A");
        expect(map[globals.ROWS_ABOVE_SURFACE][4].code).toBe("FD");
    });
});
