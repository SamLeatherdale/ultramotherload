import { CanvasClick, ZoomUpdate } from "./canvas";
import { Cell } from "./cell";
import * as globals from "./globals";
import { DataStream } from "./lib/DataStream";
import { Setup } from "./setup";
import { CreateScrollbar, ScrollbarOnScroll, ScrollButtonOnClick, UpdateCurrentRow } from "./ui";

var image_filenames = ['0200.jpg', '0201.jpg', '0202.jpg', '0203.jpg', '1000.jpg', '1001.jpg', '1002.jpg', '1003.jpg', '1100.jpg', '1101.jpg', '1102.jpg', '1103.jpg', '1900.jpg', '1901.jpg', '1902.jpg', '1903.jpg', '1A00.jpg', '1A01.jpg', '1A02.jpg', '1A03.jpg', '1B00.jpg', '1B01.jpg', '1B02.jpg', '1B03.jpg', '1C00.jpg', '1C01.jpg', '1C02.jpg', '1C03.jpg', '1D00.jpg', '1D01.jpg', '1D02.jpg', '1D03.jpg', '2300.jpg', '2301.jpg', '2302.jpg', '2303.jpg', '2400.jpg', '2401.jpg', '2402.jpg', '2403.jpg', '2600.jpg', '2601.jpg', '2602.jpg', '2603.jpg', '2700.jpg', '2701.jpg', '2702.jpg', '2703.jpg', '2800.jpg', '2801.jpg', '2802.jpg', '2803.jpg', '2900.jpg', '2901.jpg', '2902.jpg', '2903.jpg', '5000.jpg', '5001.jpg', '5002.jpg', '5003.jpg', '5100.jpg', '5101.jpg', '5102.jpg', '5103.jpg', '5200.jpg', '5201.jpg', '5202.jpg', '5203.jpg', '5300.jpg', '5301.jpg', '5302.jpg', '5303.jpg', '5400.jpg', '5401.jpg', '5402.jpg', '5403.jpg', '5500.jpg', '5501.jpg', '5502.jpg', '5503.jpg', '5600.jpg', '5601.jpg', '5602.jpg', '5603.jpg', '5700.jpg', '5701.jpg', '5702.jpg', '5703.jpg', '5800.jpg', '5801.jpg', '5802.jpg', '5803.jpg', '5900.jpg', '5901.jpg', '5902.jpg', '5903.jpg', '5A00.jpg', '5A01.jpg', '5A02.jpg', '5A03.jpg', '5B00.jpg', '5B01.jpg', '5B02.jpg', '5B03.jpg', '6400.jpg', '6401.jpg', '6402.jpg', '6403.jpg', '6500.jpg', '6501.jpg', '6502.jpg', '6503.jpg', '6600.jpg', '6601.jpg', '6602.jpg', '6603.jpg', '6700.jpg', '6701.jpg', '6702.jpg', '6703.jpg', '6800.jpg', '6801.jpg', '6802.jpg', '6803.jpg', '6900.jpg', '6901.jpg', '6902.jpg', '6903.jpg', '6A00.jpg', '6A01.jpg', '6A02.jpg', '6A03.jpg', '6B00.jpg', '6B01.jpg', '6B02.jpg', '6B03.jpg', 'Sky.jpg', 'Empty.jpg', 'Marker.jpg', 'Invisible.jpg', 'Alpha.png', 'Beta.png', 'Delta.png', 'Gamma.png', 'BossRoom.png', 'Surface.png'];

//Load & Save functions
export function LoadImages() {
    var image;
    var filename;
    for (var i = 0; i < image_filenames.length; i++) {
        filename = image_filenames[i];
        image = new Image();
        image.onload = (function(filename){
            return function() {
                LoadImageComplete(filename);
            };
        })(filename);
        image.src = "res/" + filename;
        globals.images[filename.split(".")[0]] = image;
    }
}

export var images_loaded = 0;

function LoadImageComplete(filename) {
    images_loaded += 1;
    console.log(`Loaded image ${images_loaded} out of ${image_filenames.length}`)
    if (images_loaded == image_filenames.length) {
        console.log("Image load complete");
        Setup();
    }
}

export function LoadFile() {
    console.log(this.files);

    var reader = new FileReader();
    reader.onloadend = function(e) {
        if (e.target.readyState == FileReader.DONE) { // DONE == 2
            ParseFile(e.target.result);
        }
    };

    var file = this.files[0];
    $("#map_filename").text(file.name);
    reader.readAsArrayBuffer(file);
}

//Map file export variables
var datastream;
var file_header;

export function SaveFile() {
    var data = [];
    var file;
    var cell;
    for (var row = 0; row < map.length; row++) {
        for (var col = 0; col < globals.COLS_PER_ROW; col++) {
            cell = map[row][col];
            data.push(cell.encode(cell.code));
            data.push(cell.encode(cell.color));
        }
    }
    data = new Uint8Array(data);
    var datastream = new DataStream();
    datastream.writeUint8Array(file_header); //Reattach the header
    datastream.writeUint8Array(data); //And add the body

    //Save the file
    if (URL && URL.createObjectURL) {
        if ($("#output_map").attr('href') != "") {
            URL.revokeObjectURL($("#output_map").attr('href'));
        }
        var blob = new Blob([datastream.buffer]);
        var url = URL.createObjectURL(blob);
        $("#output_map").attr('href', url);
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

function ParseFile(file) {
    datastream = new DataStream(file, 0);
    file_header = datastream.mapUint8Array(48); //First 48 bytes are the header
    var rawmap = datastream.mapUint8Array(file.byteLength - 48); //Now read the rest of the file

    //Check this is a valid file
    var verification = "";
    for (var i = 1; i < 6; i++) {
        verification += String.fromCharCode(file_header[i]);
    }
    if (verification != "XGSML") {
        console.error("This is not a valid Super Motherload Map file");
        return;
    }

    //Create the map
    globals.writeGlobals.map = [];
    var cells = [];
    var row = 0;
    var col = 0;
    var val;
    for (var i = 0; i <= rawmap.length - 2; i += 2) { //Go in blocks of two 8 bit numbers
        cells.push(new Cell(rawmap[i], rawmap[i + 1], row, col));
        col++;
        if (col == globals.COLS_PER_ROW) {
            col = 0;
            row++;
            globals.writeGlobals.map.push(cells);
            cells = [];
        }
    }

    //Initialize some stuff
    globals.writeGlobals.TOTAL_ROWS = globals.writeGlobals.map.length;
    globals.writeGlobals.MAX_VIEW_ROWS = globals.writeGlobals.TOTAL_ROWS - globals.writeGlobals.ROWS_PER_VIEW;
    globals.writeGlobals.current_row = globals.INITIAL_ROW;
    $("#input_current_row").attr("max", globals.writeGlobals.MAX_VIEW_ROWS).val(globals.INITIAL_ROW);
    $("#input_current_depth").attr({min: -(globals.writeGlobals.MAX_VIEW_ROWS - globals.ROWS_ABOVE_SURFACE) * globals.INGAME_DEPTH_RATIO,
        max: globals.ROWS_ABOVE_SURFACE * globals.INGAME_DEPTH_RATIO
    });
    CreateScrollbar();
    UpdateCurrentRow(globals.INITIAL_ROW);

    draw_allowed = true;
    ZoomUpdate();
    globals.writeGlobals.map[globals.ROWS_ABOVE_SURFACE][1].click(); //Click the first ground cell, so we can start keyboard navigation


    //Set up event handlers for post-load events
    $("#load_splash").hide();
    $("#map").css({display: "inline-block"}); //Show the canvas

    $("#map_scrollbar, #map").mousewheel(ScrollbarOnScroll);
    $("#map_scrollcontrols button").click(ScrollButtonOnClick);
    $("#map").click(CanvasClick);
    $("#input_current_row").change(function() {
        UpdateCurrentRow(parseInt($(this).val()));
    });
    $("#input_current_depth").change(function() {
        var row = -(Math.round(parseFloat($(this).val()) / globals.INGAME_DEPTH_RATIO)) + globals.ROWS_ABOVE_SURFACE;
        UpdateCurrentRow(row);
    });
}
