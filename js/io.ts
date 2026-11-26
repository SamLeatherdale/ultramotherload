import $ from "jquery";
import sampleMapUrl from "../res/sample_map.bin?url";
import { BindMapPointer, ZoomUpdate } from "./canvas";
import { Cell } from "./cell";
import * as globals from "./globals";
import { state } from "./globals";
import { Setup } from "./setup";
import {
    ClearLoadWarning,
    clearHistory,
    CreateScrollbar,
    ScrollbarOnScroll,
    ScrollButtonOnClick,
    ShowLoadWarning,
    UpdateCurrentRow,
} from "./ui";
import { imageAssets } from "./images";

const MAP_HEADER_SIZE = 48;
const MAP_FILE_MAGIC = [0x01, 0x58, 0x47, 0x53, 0x4d, 0x4c, 0x5f, 0xff] as const;
const MAP_FILE_VERSION = 0;
const MAP_CHUNK_COUNT = 1;
const MAP_FILE_TYPE = 2;
const MAP_CHUNK_VERSION = 0;
const MAP_PAYLOAD_SIZE = globals.MAP_ROWS * globals.COLS_PER_ROW * 2; // 0x1BDE8 = 114,152 bytes
const MAP_TOTAL_SIZE = MAP_HEADER_SIZE + MAP_PAYLOAD_SIZE; // 0x1BE18 = 114,200 bytes
const SAVE_TYPE_NAMES: Record<number, string> = {
    0: "progress",
    1: "characters",
    5: "preferences",
    6: "bindings",
};
const imageEntries = Object.entries(imageAssets);

//Load & Save functions
export function LoadImages() {
    for (const [name, url] of imageEntries) {
        const image = new Image();
        image.onload = LoadImageComplete;
        image.src = url;
        globals.images[name] = image;
    }
}

export var images_loaded = 0;

function LoadImageComplete() {
    images_loaded += 1;
    if (images_loaded == imageEntries.length) {
        console.log("Image load complete");
        Setup();
    }
}

export function LoadFile(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onloadend = function () {
        if (reader.readyState == FileReader.DONE && reader.result instanceof ArrayBuffer) {
            if (ParseFile(reader.result)) {
                $("#map_filename").text(file.name);
            }
        }
        input.value = "";
    };
    reader.onerror = function () {
        ShowLoadWarning("Could not read that file.");
        input.value = "";
    };

    reader.readAsArrayBuffer(file);
}

//Map file export variables
var file_header: Uint8Array<ArrayBuffer>;

export function parseMapBuffer(file: ArrayBuffer): {
    header: Uint8Array<ArrayBuffer>;
    map: Cell[][];
} {
    if (file.byteLength < MAP_HEADER_SIZE) {
        throw new Error("This is not a valid Super Motherload Map file");
    }

    const array = new Uint8Array(file);
    const header = array.slice(0, MAP_HEADER_SIZE); //First 48 bytes are the header
    const rawMap = array.slice(MAP_HEADER_SIZE); //Now read the rest of the file

    //Check full 8-byte XGSML file signature (\x01XGSML_\xff)
    for (let i = 0; i < MAP_FILE_MAGIC.length; i++) {
        if (header[i] !== MAP_FILE_MAGIC[i]) {
            throw new Error("This is not a valid Super Motherload Map file");
        }
    }

    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    const fileVersion = view.getUint32(8, true);
    if (fileVersion !== MAP_FILE_VERSION) {
        throw new Error(
            `This is not a valid Super Motherload Map file (unsupported file version ${fileVersion})`,
        );
    }

    const fileType = view.getUint32(32, true);
    if (fileType !== MAP_FILE_TYPE) {
        const known = SAVE_TYPE_NAMES[fileType];
        const what = known
            ? `a Super Motherload ${known} file`
            : `a Super Motherload save of type ${fileType}`;
        throw new Error(
            `This is ${what}, not a map. Load the map file from the same world folder.`,
        );
    }

    const chunkCount = view.getUint32(20, true);
    const chunkVersion = view.getUint32(36, true);
    if (chunkCount !== MAP_CHUNK_COUNT || chunkVersion !== MAP_CHUNK_VERSION) {
        throw new Error("This is not a valid Super Motherload Map file (unsupported chunk header)");
    }

    const declaredTotalSizeLo = view.getUint32(12, true);
    const declaredTotalSizeHi = view.getUint32(16, true);
    const declaredPayloadSize = view.getUint32(40, true);
    if (
        declaredTotalSizeHi !== 0 ||
        declaredTotalSizeLo !== file.byteLength ||
        declaredPayloadSize !== rawMap.length
    ) {
        throw new Error("This is not a valid Super Motherload Map file (header size mismatch)");
    }

    if (rawMap.length !== MAP_PAYLOAD_SIZE) {
        throw new Error("This is not a valid Super Motherload Map file (invalid map dimensions)");
    }

    //Create the map
    const map: Cell[][] = [];
    let cells: Cell[] = [];
    let row = 0;
    let col = 0;
    for (let i = 0; i <= rawMap.length - 2; i += 2) {
        //Go in blocks of two 8 bit numbers
        cells.push(new Cell(rawMap[i], rawMap[i + 1], row, col));
        col++;
        if (col == globals.COLS_PER_ROW) {
            col = 0;
            row++;
            map.push(cells);
            cells = [];
        }
    }

    return { header, map };
}

export function serializeMapBuffer(
    header: Uint8Array<ArrayBuffer>,
    map: Cell[][],
): Uint8Array<ArrayBuffer> {
    if (header.length !== MAP_HEADER_SIZE) {
        throw new Error("Invalid map header length");
    }
    if (map.length !== globals.MAP_ROWS || map.some((row) => row.length !== globals.COLS_PER_ROW)) {
        throw new Error("Invalid map dimensions for export");
    }

    const data = new Uint8Array(MAP_TOTAL_SIZE);
    data.set(header, 0);
    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < globals.COLS_PER_ROW; col++) {
            const cell = map[row][col];
            const offset = header.length + (row * globals.COLS_PER_ROW + col) * 2;
            data[offset] = cell.encode(cell.code);
            data[offset + 1] = cell.encode(cell.color);
        }
    }
    return data;
}

export function SaveFile() {
    const output = serializeMapBuffer(file_header, state.map);

    //Save the file
    if (URL && URL.createObjectURL) {
        const existingUrl = $("#output_map").attr("href");
        if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
        }
        var blob = new Blob([output], { type: "application/octet-stream" });
        var url = URL.createObjectURL(blob);
        $("#output_map").attr("href", url);
        $("#output_map")[0].click(); //Trigger underlying
    } else {
        alert("Can't create object URL.");
    }
}

export function LoadDefaultMap() {
    /* Loading arrayBuffers using AJAX is not supported by jQuery, use native XMLHttpRequest instead:
     * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
     */
    var oReq = new XMLHttpRequest();
    oReq.open("GET", sampleMapUrl, true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function () {
        if (this.readyState == 4 && this.status == 200) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {
                ParseFile(arrayBuffer);
            }
        }
    };

    oReq.send();
}

export var draw_allowed = false;

function ParseFile(file: ArrayBuffer): boolean {
    let parsed: { header: Uint8Array<ArrayBuffer>; map: Cell[][] };
    try {
        parsed = parseMapBuffer(file);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(message);
        ShowLoadWarning(message);
        return false;
    }

    ClearLoadWarning();

    file_header = parsed.header;
    state.map = parsed.map;
    clearHistory();

    //Initialize some stuff
    state.total_rows = state.map.length;
    state.max_view_rows = state.total_rows - state.rows_per_view;
    state.current_row = globals.INITIAL_ROW;
    $("#input_current_row").attr("max", state.max_view_rows).val(globals.INITIAL_ROW);
    $("#input_current_depth").attr({
        min: -(state.max_view_rows - globals.ROWS_ABOVE_SURFACE) * globals.INGAME_DEPTH_RATIO,
        max: globals.ROWS_ABOVE_SURFACE * globals.INGAME_DEPTH_RATIO,
    });
    CreateScrollbar();
    UpdateCurrentRow(globals.INITIAL_ROW);

    draw_allowed = true;
    ZoomUpdate();
    state.map[globals.ROWS_ABOVE_SURFACE][1].click(); //Click the first ground cell, so we can start keyboard navigation

    //Set up event handlers for post-load events
    $("#load_splash").hide();
    $("#map").css({ display: "inline-block" }); //Show the canvas

    $("#map_scrollbar, #map").mousewheel(ScrollbarOnScroll);
    $("#map_scrollcontrols > button").on("click", function () {
        ScrollButtonOnClick(this);
    });
    BindMapPointer();
    $("#input_current_row").change(function (event) {
        UpdateCurrentRow(parseInt($(event.target).val() as string));
    });
    $("#input_current_depth").change(function (event) {
        var row =
            -Math.round(parseFloat($(event.target).val() as string) / globals.INGAME_DEPTH_RATIO) +
            globals.ROWS_ABOVE_SURFACE;
        UpdateCurrentRow(row);
    });

    return true;
}
