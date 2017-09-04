"use strict";
//Map file variables
var datastream;
var file_header;

//Constants
var materials = {'FE':'Invisible Barrier','FF':'Sky','01':'Empty','02':'Empty (edge)','10':'Dirt','11':'Dirt (edge)','19':'Rock','1A':'Metal Plate','1B':'Molten Plate','1C':'Magma','1D':'Barrier','23':'Fuel','24':'Repair','26':'TNT','27':'C4','28':'Shaft Bomb','29':'T Bomb','50':'Ironium','51':'Bronzium','52':'Silverium','53':'Goldium','54':'Platinium','55':'Explodium','56':'Emerald','57':'Ruby','58':'Diamond','59':'Amazonite','5A':'Electronium','5B':'Unobtanium','64':'Mutant Skull','65':'Arm Bones','66':'Rib Bones','67':'Hip Bones','68':'Leg Bones','69':'Hammer','6A':'Scrap Metal','6B':'Beacon'};
var backgrounds = {'00':'Red','01':'Brown','02':'Grey','03':'Black'};
var image_filenames = ['0200.jpg','0201.jpg','0202.jpg','0203.jpg','1000.jpg','1001.jpg','1002.jpg','1003.jpg','1100.jpg','1101.jpg','1102.jpg','1103.jpg','1900.jpg','1901.jpg','1902.jpg','1903.jpg','1A00.jpg','1A01.jpg','1A02.jpg','1A03.jpg','1B00.jpg','1B01.jpg','1B02.jpg','1B03.jpg','1C00.jpg','1C01.jpg','1C02.jpg','1C03.jpg','1D00.jpg','1D01.jpg','1D02.jpg','1D03.jpg','2300.jpg','2301.jpg','2302.jpg','2303.jpg','2400.jpg','2401.jpg','2402.jpg','2403.jpg','2600.jpg','2601.jpg','2602.jpg','2603.jpg','2700.jpg','2701.jpg','2702.jpg','2703.jpg','2800.jpg','2801.jpg','2802.jpg','2803.jpg','2900.jpg','2901.jpg','2902.jpg','2903.jpg','5000.jpg','5001.jpg','5002.jpg','5003.jpg','5100.jpg','5101.jpg','5102.jpg','5103.jpg','5200.jpg','5201.jpg','5202.jpg','5203.jpg','5300.jpg','5301.jpg','5302.jpg','5303.jpg','5400.jpg','5401.jpg','5402.jpg','5403.jpg','5500.jpg','5501.jpg','5502.jpg','5503.jpg','5600.jpg','5601.jpg','5602.jpg','5603.jpg','5700.jpg','5701.jpg','5702.jpg','5703.jpg','5800.jpg','5801.jpg','5802.jpg','5803.jpg','5900.jpg','5901.jpg','5902.jpg','5903.jpg','5A00.jpg','5A01.jpg','5A02.jpg','5A03.jpg','5B00.jpg','5B01.jpg','5B02.jpg','5B03.jpg','6400.jpg','6401.jpg','6402.jpg','6403.jpg','6500.jpg','6501.jpg','6502.jpg','6503.jpg','6600.jpg','6601.jpg','6602.jpg','6603.jpg','6700.jpg','6701.jpg','6702.jpg','6703.jpg','6800.jpg','6801.jpg','6802.jpg','6803.jpg','6900.jpg','6901.jpg','6902.jpg','6903.jpg','6A00.jpg','6A01.jpg','6A02.jpg','6A03.jpg','6B00.jpg','6B01.jpg','6B02.jpg','6B03.jpg','Boss_Room.jpg','Empty.jpg','Marker.jpg','Outpost_Alpha.jpg','Outpost_Beta.jpg','Outpost_Delta.jpg','Outpost_Gamma.jpg','Sky.jpg','Surface.jpg'];
var START_BYTE = 24;
var TOTAL_ROWS;
var ROWS_PER_VIEW = 30;
var MAX_VIEW_ROWS;
var COLS_PER_ROW = 38;
var VIEW_COLS_PER_ROW = 36;
var IMG_SIZE = 30;

//Images
var images = {};
var images_loaded = 0;

//
var keys = {control: false, shift: false};
var map = [];
var ctx;
var zoom_level = 1;
var current_row = 290; //Start at row 290, near surface level
var selected_tool;
var selected_cells = {};
var paste_cells = {};
var last_selected = false;
var overwrite_code;
var current_action = false;

//Draw colours
var selected_color = "#00fffa";
var last_selected_color = "#0072ff";
var paste_color = "#9800ff";

function Cell(hexcode, row, col) {
    this.row = row;
    this.col = col;
    this.id = row * COLS_PER_ROW + col;
    this.selected = false;
    this.paste_code = 0;
    while (hexcode.length < 4) {
        hexcode = "0" + hexcode;
    }
    this.update(hexcode);
}
Cell.prototype.encode = function() {
    return parseInt(this.hexcode, 16);
}
Cell.prototype.update = function(hexcode) {
    this.code = hexcode.substring(0, 2);
    this.color = hexcode.substring(2);
    this.hexcode = hexcode;
}
Cell.prototype.updateCode = function(code) {
    if (this.code == "FE" || this.code == "FD") {
        return; //Don't override markers
    }
    this.code = code;
    this.hexcode = this.code + this.color;
}
Cell.prototype.select = function(lastSelected, force) {
    lastSelected = lastSelected || true;
    force = force || false;
    if (force || !this.isSelected()) {
        selected_cells[this.id] = this;
    } else {
        delete selected_cells[this.id];
    }
    if (lastSelected) {
        last_selected = this;
        $("#info_cell_row").text(this.row);
        $("#info_cell_col").text(this.col);
        $("#info_cell_hexcode").text(this.hexcode);
    }
}
Cell.prototype.isSelected = function() {
    return (typeof selected_cells[this.id] != "undefined");
}
Cell.prototype.isPasting = function() {
    return (typeof paste_cells[this.id] != "undefined");
}

//Helper functions
function mapLoaded() {
    return (map.length > 0);
}

function getImage(code, hexcode) {
    if (code == "FE" || code == "FD") {
        return "Marker"; //FE is sky floor, and also first row of outposts (FE00, FE01, etc)
    } else if (code == "FF") {
        return "Sky";
    } else if (code == "01") {
        return "Empty";
    } else {
        return hexcode;
    }
}

//Canvas functions
function Redraw() {
    if (!mapLoaded()) {
        return;
    }
    var zoom_img_size = IMG_SIZE * zoom_level;
    ctx.clearRect(0, 0, $("#map").width, $("#map").height);
    var cell;
    for (var row = 0; row < ROWS_PER_VIEW; row++) {
        for (var col = 0; col < VIEW_COLS_PER_ROW; col++) {
            cell = map[row + current_row][col + 1]; //Exclude marker columns
            var x = col * zoom_img_size;
            var y = row * zoom_img_size;
            try {
                ctx.drawImage(images[getImage(cell.code, cell.hexcode)], x, y, zoom_img_size, zoom_img_size);
            } catch (err) {
                console.error("Failed to draw " + cell.hexcode);
            }
            if (cell.isSelected() || cell.isPasting()) {
                ctx.strokeStyle = selected_color;
                if (cell.id == last_selected.id) {
                    ctx.strokeStyle = last_selected_color;
                } else if (cell.isPasting()) {
                    ctx.strokeStyle = paste_color;
                }
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 0.5, y + 0.5, zoom_img_size - 1, zoom_img_size - 1);
            }
        }
    }
}

function UpdateCanvasSize() {
    var canvas = $("#map")[0];
    var newwidth = VIEW_COLS_PER_ROW * IMG_SIZE * zoom_level;
    var newheight = ROWS_PER_VIEW * IMG_SIZE * zoom_level;
    canvas.width = newwidth;
    canvas.height = newheight;
    $("#map_controls").css({height: newheight});
    ctx = canvas.getContext('2d');
}

function CanvasClick(e) {
    var targetRow = current_row + Math.floor(e.offsetY / (IMG_SIZE * zoom_level));
    var targetCol = Math.floor(e.offsetX / (IMG_SIZE * zoom_level)) + 1; //Add one to account for marker
    var target = map[targetRow][targetCol];
    if (current_action == "action_copy") {
        paste_cells = {};
        var startRow = TOTAL_ROWS;
        var startCol = TOTAL_ROWS;
        $.each(selected_cells, function(id, cell) {
            if (cell.row < startRow) {
                startRow = cell.row;
            } else if (cell.col < startCol) {
                startCol = cell.col;
            }
        });
        var transformRow = target.row - startRow;
        var transformCol = target.col - startCol;
        var pcell;
        $.each(selected_cells, function(id, cell) {
            pcell = map[cell.row + transformRow][cell.col + transformCol];
            pcell.paste_code = cell.code;
            paste_cells[pcell.id] = pcell;
        });
    } else if (selected_tool == "tool_overwrite") {
        target.updateCode(overwrite_code);
    } else {
        if (keys.shift && !!last_selected) {
            var cellA = target;
            var cellB = last_selected;
            //cellB.select(); //Flip original first, so it matches the other tiles
            var startRow = (cellA.row < cellB.row) ? cellA.row : cellB.row;
            var startCol = (cellA.col < cellB.col) ? cellA.col : cellB.col;
            var endRow = (cellA.row > cellB.row) ? cellA.row : cellB.row;
            var endCol = (cellA.col > cellB.col) ? cellA.col : cellB.col;
            for (var row = startRow; row <= endRow; row++) {
                for (var col = startCol; col <= endCol; col++) {
                    map[row][col].select(false, true);
                }
            }
            target.select(true, true); //Ensures that the target is last_selected as opposed to endRol, endCol
        } else if (keys.control) {
            target.select();
        } else {
            selected_cells = {}
            target.select();
        }
    }
    CheckActionState();
    Redraw();
}


//UI functions
function CreateScrollbar() {
    var handle = $("#map_scrollbar .ui-slider-handle");
    $("#map_scrollbar").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: MAX_VIEW_ROWS,
        value: MAX_VIEW_ROWS - current_row,
        create: function() {
            handle.text(MAX_VIEW_ROWS - $(this).slider("value"));
        },
        slide: function(event, ui) {
            UpdateCurrentRow(MAX_VIEW_ROWS - ui.value);
        },
        stop: function(event, ui) {

        }
    });
}

function ScrollbarOnScroll(event) {
    var SCROLL_FACTOR = 5;
    var newvalue = current_row - event.deltaY * SCROLL_FACTOR;
    UpdateCurrentRow(newvalue);
}

function ScrollButtonOnClick(event) {
    var SCROLL_MANY = 20;
    var id = $(this).attr("id");
    if (id == "map_upmany") {
        UpdateCurrentRow(current_row - SCROLL_MANY);
    } else if (id == "map_upone") {
        UpdateCurrentRow(current_row - 1);
    } else if (id == "map_downone") {
        UpdateCurrentRow(current_row + 1)
    } else if (id == "map_downmany") {
        UpdateCurrentRow(current_row + SCROLL_MANY);
    }
}

function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val());
    UpdateCanvasSize();
    Redraw();
}

function UpdateCurrentRow(newvalue) {
    if (newvalue < 0) {
        current_row = 0;
    } else if (newvalue > MAX_VIEW_ROWS) {
        current_row = MAX_VIEW_ROWS;
    } else {
        current_row = newvalue;
    }
    $("#map_scrollbar").slider("value", MAX_VIEW_ROWS - newvalue);
    $("#map_scrollbar .ui-slider-handle").text(current_row);
    Redraw();
}

function CreateMaterialsPanel() {
    var m;
    $.each(materials, function(code, name) {
        m = $(".material-container:first-child").clone();
        m.attr("data-code", code);
        m.find(".material-icon").css({backgroundImage: "url(res/" + getImage(code, code + "00") +".jpg)"});
        m.find(".material-title").text(name);
        $("#map_materials_container").append(m);
    });
    $(".material-container:first-child").remove(); //Remove template material
}

function SelectMaterial() {
    $("#current_material_container").empty();
    $(this).clone().appendTo($("#current_material_container"));
    overwrite_code = $(this).attr("data-code");
    //$("#map_materials_panel").hide();
    //$("#current_material_container").popover("hide");
}

function OpenMaterialPanel() {
    //$("#map_materials_panel").show();

}

function SelectTool() {
    //Reset selection
    selected_cells = {};
    last_selected = false;

    selected_tool = $(this).attr('id');
    $(".button-tool").removeClass("ui-state-active");
    $(this).addClass("ui-state-active");
}

function SelectAction() {
    if ($(this).hasClass("ui-state-disabled")) {
        return;
    }
    var action = $(this).attr("id");
    if (action == "action_replace") {
        $.each(selected_cells, function(id, cell) {
            cell.updateCode(overwrite_code);
        });
        Redraw();
    } else if (action == "action_copy") {
        if (current_action == "action_copy") {
            //We are cancelling copy
            current_action = false;
            paste_cells = {};
            Redraw();
        } else {
            current_action = "action_copy";
            paste_cells = selected_cells;
            Redraw();
        }
    } else if (action == "action_paste") {
        $.each(paste_cells, function(id, cell) {
            cell.updateCode(cell.paste_code);
            cell.paste_code = 0;
        });
        paste_cells = {};
        Redraw();
        current_action = false;
    }
    CheckActionState();
}

function CheckActionState() {
    if (Object.keys(selected_cells).length == 0) {
        $(".button-action").addClass("ui-state-disabled");
    } else {
        $("#action_paste").addClass("ui-state-disabled");
        $(".button-action:not(#action_paste)").removeClass("ui-state-disabled");
    }
    if (current_action == "action_copy") {
        $("#action_copy span").text("Cancel Copy");
        $("#action_replace").addClass("ui-state-disabled");
        $(".button-action:not(#action_replace)").removeClass("ui-state-disabled");
    } else {
        $("#action_copy span").text("Copy Selected");
    }
}
//Load & Save functions
function LoadImages() {
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
        images[filename.split(".")[0]] = image;
    }
}

function LoadImageComplete(filename) {
    images_loaded += 1;
    console.log("Loaded " + filename);
    if (images_loaded == image_filenames.length) {
        console.log("Load complete");
    }
}

function LoadFile() {
    console.log(this.files);

    var reader = new FileReader();
    reader.onloadend = ParseFile;

    var file = this.files[0];
    reader.readAsArrayBuffer(file);
}

function ParseFile(e) {
    if (e.target.readyState == FileReader.DONE) { // DONE == 2
        datastream = new DataStream(e.target.result, 0, DataStream.BIG_ENDIAN);
        file_header = datastream.mapUint8Array(48); //First 48 bytes are the header
        var rawmap = datastream.mapUint16Array(); //Now read the rest of the file
        //Check this is a valid file
        var verification = "";
        for (var i = 1; i < 6; i++) {
            verification += String.fromCharCode(file_header[i]);
        }
        if (verification != "XGSML") {
            console.error("This is not a valid Super Motherload Map file");
            return;
        }
        map = [];
        var cells = [];
        var row = 0;
        var col = 0;
        for (var i = 0; i < rawmap.length; i++) {
            cells.push(new Cell(rawmap[i].toString(16).toUpperCase(), row, col));
            col++;
            if (col == COLS_PER_ROW) {
                col = 0;
                row++;
                map.push(cells);
                cells = [];
            }
        }
        TOTAL_ROWS = map.length;
        MAX_VIEW_ROWS = TOTAL_ROWS - ROWS_PER_VIEW;
        CreateScrollbar();
        ZoomUpdate();

        //Set up event handlers for post-load events
        $("#map_scrollbar, #map").mousewheel(ScrollbarOnScroll);
        $("#map_scrollcontrols button").click(ScrollButtonOnClick);
        $("#map").click(CanvasClick);
    };
}

function SaveFile() {
    var data = [];
    var file;
    for (var row = 0; row < map.length; row++) {
        for (var col = 0; col < COLS_PER_ROW; col++) {
            data.push(map[row][col].encode());
        }
    }
    data = new Uint16Array(data);
    console.log(data);
    var datastream = new DataStream();
    datastream.writeUint8Array(file_header); //Reattach the header
    datastream.writeUint16Array(data, DataStream.BIG_ENDIAN);
    datastream.save("map");
}


$(function() {
    // Check for the various File API support.
    if (window.File && window.FileReader) {
      // Great success! All the File APIs are supported.
    } else {
      alert('The File APIs are not fully supported in this browser.');
    }

    LoadImages();
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").change(LoadFile);
    $("#map_zoom").change(ZoomUpdate);

    $(".button-tool").click(SelectTool);
    $("#tool_select").click();

    $(".button-action").click(SelectAction);
    CheckActionState();

    $("#map_materials_container .material-container").click(SelectMaterial);
    $("#current_material_container").popover({
        content: $("#map_materials_container"),
        html: true,
        title: "Select a material",
        trigger: "focus",

    });
    $(".material-container:first-child").click(); //Select first material as default
    //$("#current_material_container").click(OpenMaterialPanel);


    $(document).on('keyup keydown', function(e) {
        var pressed = (e.type == "keydown");
        var key = e.which;
        if (key == 16) { //Shift
            keys.shift = pressed;
        } else if (key == 17) { //Ctrl
            keys.control = pressed;
        }
    });
});
