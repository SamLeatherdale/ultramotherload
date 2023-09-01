import { CanvasClick, ZoomUpdate } from "./canvas";
import { Cell } from "./cell";
import * as globals from "./globals";
import { state } from "./globals";
import { Setup } from "./setup";
import {
    CreateScrollbar,
    ScrollbarOnScroll,
    ScrollButtonOnClick,
    UpdateCurrentRow,
} from "./ui";
import { image_filenames } from "./images";

//Load & Save functions
export function LoadImages() {
    var image;
    var filename;
    for (var i = 0; i < image_filenames.length; i++) {
        filename = image_filenames[i];
        image = new Image();
        image.onload = LoadImageComplete;
        image.src = "res/" + filename;
        globals.images[filename.split(".")[0]] = image;
    }
}

export var images_loaded = 0;

function LoadImageComplete() {
    images_loaded += 1;
    if (images_loaded == image_filenames.length) {
        console.log("Image load complete");
        Setup();
    }
}

export function LoadFile(input: HTMLInputElement) {
    console.log(input.files);

    const reader = new FileReader();
    reader.onloadend = function () {
        if (reader.readyState == FileReader.DONE) {
            // DONE == 2
            ParseFile(reader.result as ArrayBuffer);
        }
    };

    if (input.files) {
        var file = input.files[0];
        $("#map_filename").text(file.name);
        reader.readAsArrayBuffer(file);
    }
}

//Map file export variables
var file_header: Uint8Array;

export function SaveFile() {
    const data = new Uint8Array(state.map.length * globals.COLS_PER_ROW * 2);
    for (let row = 0; row < state.map.length; row++) {
        for (let col = 0; col < globals.COLS_PER_ROW; col++) {
            const cell = state.map[row][col];
            const offset = (row * globals.COLS_PER_ROW + col) * 2;
            data[offset] = cell.encode(cell.code);
            data[offset + 1] = cell.encode(cell.color);
        }
    }

    //Save the file
    if (URL && URL.createObjectURL) {
        const existingUrl = $("#output_map").attr("href");
        if (existingUrl) {
            URL.revokeObjectURL(existingUrl);
        }
        var blob = new Blob([file_header, data]);
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
    oReq.open("GET", "res/sample_map.bin", true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
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

function ParseFile(file: ArrayBuffer) {
    const array = new Uint8Array(file);
    file_header = array.slice(0, 48); //First 48 bytes are the header
    const rawMap = array.slice(48); //Now read the rest of the file

    //Check this is a valid file
    let verification = "";
    for (let i = 1; i < 6; i++) {
        verification += String.fromCharCode(file_header[i]);
    }
    if (verification != "XGSML") {
        console.error("This is not a valid Super Motherload Map file");
        return;
    }

    //Create the map
    state.map = [];
    let cells = [];
    let row = 0;
    let col = 0;
    for (let i = 0; i <= rawMap.length - 2; i += 2) {
        //Go in blocks of two 8 bit numbers
        cells.push(new Cell(rawMap[i], rawMap[i + 1], row, col));
        col++;
        if (col == globals.COLS_PER_ROW) {
            col = 0;
            row++;
            state.map.push(cells);
            cells = [];
        }
    }

    //Initialize some stuff
    state.total_rows = state.map.length;
    state.max_view_rows = state.total_rows - state.rows_per_view;
    state.current_row = globals.INITIAL_ROW;
    $("#input_current_row")
        .attr("max", state.max_view_rows)
        .val(globals.INITIAL_ROW);
    $("#input_current_depth").attr({
        min:
            -(state.max_view_rows - globals.ROWS_ABOVE_SURFACE) *
            globals.INGAME_DEPTH_RATIO,
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
    $("#map_scrollcontrols button").click((e) => ScrollButtonOnClick(e.target));
    $("#map").click(CanvasClick);
    $("#input_current_row").change(function (event) {
        UpdateCurrentRow(parseInt($(event.target).val() as string));
    });
    $("#input_current_depth").change(function (event) {
        var row =
            -Math.round(
                parseFloat($(event.target).val() as string) /
                    globals.INGAME_DEPTH_RATIO,
            ) + globals.ROWS_ABOVE_SURFACE;
        UpdateCurrentRow(row);
    });
}
