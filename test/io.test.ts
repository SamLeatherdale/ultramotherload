import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import * as globals from "../js/globals";
import { parseMapBuffer, serializeMapBuffer } from "../js/io";

function toArrayBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

const sampleMapPath = path.resolve(import.meta.dirname, "../res/sample_map.bin");

describe("parseMapBuffer and serializeMapBuffer", () => {
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

    it("persists tile edits on export", () => {
        const inputBytes = fs.readFileSync(sampleMapPath);
        const { header, map } = parseMapBuffer(toArrayBuffer(inputBytes));

        map[globals.ROWS_ABOVE_SURFACE][1].updateCode("58"); // Diamond

        const exported = serializeMapBuffer(header, map);
        expect(exported.length).toBe(inputBytes.length);

        const editOffset = 48 + (globals.ROWS_ABOVE_SURFACE * globals.COLS_PER_ROW + 1) * 2;
        expect(exported[editOffset]).toBe(0x58);
        expect(exported[editOffset + 1]).toBe(inputBytes[editOffset + 1]);

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

    it("rejects files with invalid magic prefix/suffix, file version, chunk count, or payload size", () => {
        const base = fs.readFileSync(sampleMapPath);

        const badMagic = Buffer.from(base);
        badMagic[0] = 0x00;
        expect(() => parseMapBuffer(toArrayBuffer(badMagic))).toThrow(
            "This is not a valid Super Motherload Map file",
        );

        const badVersion = Buffer.from(base);
        badVersion.writeUInt32LE(1, 8);
        expect(() => parseMapBuffer(toArrayBuffer(badVersion))).toThrow("unsupported file version");

        const badChunkCount = Buffer.from(base);
        badChunkCount.writeUInt32LE(2, 20);
        expect(() => parseMapBuffer(toArrayBuffer(badChunkCount))).toThrow(
            "unsupported chunk header",
        );

        const badChunkVersion = Buffer.from(base);
        badChunkVersion.writeUInt32LE(1, 36);
        expect(() => parseMapBuffer(toArrayBuffer(badChunkVersion))).toThrow(
            "unsupported chunk header",
        );

        const badHiSize = Buffer.from(base);
        badHiSize.writeUInt32LE(1, 16);
        expect(() => parseMapBuffer(toArrayBuffer(badHiSize))).toThrow("header size mismatch");

        const wrongDims = Buffer.alloc(48 + 38 * 2 * 400);
        base.copy(wrongDims, 0, 0, 48);
        wrongDims.writeUInt32LE(wrongDims.length, 12);
        wrongDims.writeUInt32LE(wrongDims.length - 48, 40);
        expect(() => parseMapBuffer(toArrayBuffer(wrongDims))).toThrow("invalid map dimensions");
    });

    it("round-trips experimental tile codes (12, 25, 2A, FD)", () => {
        const inputBytes = fs.readFileSync(sampleMapPath);
        const { header, map } = parseMapBuffer(toArrayBuffer(inputBytes));

        globals.state.safe_mode = false;
        map[globals.ROWS_ABOVE_SURFACE][1].updateCode("12");
        map[globals.ROWS_ABOVE_SURFACE][2].updateCode("25");
        map[globals.ROWS_ABOVE_SURFACE][3].updateCode("2A");
        map[globals.ROWS_ABOVE_SURFACE][4].updateCode("FD");

        const exported = serializeMapBuffer(header, map);
        const reparsed = parseMapBuffer(toArrayBuffer(Buffer.from(exported)));
        expect(reparsed.map[globals.ROWS_ABOVE_SURFACE][1].code).toBe("12");
        expect(reparsed.map[globals.ROWS_ABOVE_SURFACE][2].code).toBe("25");
        expect(reparsed.map[globals.ROWS_ABOVE_SURFACE][3].code).toBe("2A");
        expect(reparsed.map[globals.ROWS_ABOVE_SURFACE][4].code).toBe("FD");
    });
});
