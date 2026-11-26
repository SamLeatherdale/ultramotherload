import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import * as globals from "../js/globals";
import { parseMapBuffer, serializeMapBuffer } from "../js/io";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const sampleMapPath = path.resolve(import.meta.dirname, "../res/sample_map.bin");

describe("Super Motherload map import/edit/export", () => {
    beforeEach(() => {
        globals.state.safe_mode = true;
        globals.state.last_selected = undefined;
    });

    it("round-trips sample_map.bin without byte changes", () => {
        const inputBytes = fs.readFileSync(sampleMapPath);
        const { header, map } = parseMapBuffer(toArrayBuffer(inputBytes));

        expect(map.length).toBe(1502);
        expect(map[0].length).toBe(globals.COLS_PER_ROW);

        const exported = serializeMapBuffer(header, map);
        expect(Buffer.from(exported)).toEqual(inputBytes);
    });

    it("persists tile edits and respects safe mode locks on export", () => {
        const inputBytes = fs.readFileSync(sampleMapPath);
        const { header, map } = parseMapBuffer(toArrayBuffer(inputBytes));

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

        // Outpost tile is locked in safe mode, editable when safe mode is off
        const outpostCell = map[445][10];
        expect(outpostCell.is_outpost).toBe(true);
        expect(outpostCell.isLocked()).toBe(true);
        const originalOutpostCode = outpostCell.code;
        outpostCell.updateCode("58");
        expect(outpostCell.code).toBe(originalOutpostCode);

        const exported = serializeMapBuffer(header, map);
        expect(exported.length).toBe(inputBytes.length);

        const editOffset = 48 + (globals.ROWS_ABOVE_SURFACE * globals.COLS_PER_ROW + 1) * 2;
        expect(exported[editOffset]).toBe(0x58);
        expect(exported[editOffset + 1]).toBe(inputBytes[editOffset + 1]);

        // Re-importing exported map preserves the edited tile
        const reparsed = parseMapBuffer(toArrayBuffer(Buffer.from(exported)));
        expect(reparsed.map[globals.ROWS_ABOVE_SURFACE][1].code).toBe("58");
    });

    it("rejects files without the XGSML header", () => {
        const invalid = new Uint8Array(128).buffer;
        expect(() => parseMapBuffer(invalid)).toThrow(
            "This is not a valid Super Motherload Map file",
        );
    });

    it("rejects non-map XGSML save files such as progress files", () => {
        const progressFile = new Uint8Array(5232);
        const magic = [0x01, 0x58, 0x47, 0x53, 0x4d, 0x4c, 0x5f, 0xff];
        progressFile.set(magic, 0);
        const view = new DataView(progressFile.buffer);
        view.setUint32(12, 5232, true);
        view.setUint32(20, 1, true);
        view.setUint32(32, 0, true); // progress file type ID
        view.setUint32(40, 5184, true);

        expect(() => parseMapBuffer(progressFile.buffer)).toThrow(
            "This is a Super Motherload progress file, not a map.",
        );
    });

    it("rejects map files whose header sizes do not match payload length", () => {
        const inputBytes = fs.readFileSync(sampleMapPath);
        const truncated = inputBytes.subarray(0, inputBytes.length - 10);

        expect(() => parseMapBuffer(toArrayBuffer(truncated))).toThrow("header size mismatch");
    });
});
