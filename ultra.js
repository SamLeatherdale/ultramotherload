"use strict";
//Map file variables
var datastream;
var file_header;

//Constants
var materials = {'FE':'Invisible Barrier','FF':'Sky','01':'Empty','02':'Empty (edge)','10':'Dirt','11':'Dirt (edge)','19':'Rock','1A':'Metal Plate','1B':'Molten Plate','1C':'Magma','1D':'Barrier','23':'Fuel','24':'Repair','26':'TNT','27':'C4','28':'Shaft Bomb','29':'T Bomb','50':'Ironium','51':'Bronzium','52':'Silverium','53':'Goldium','54':'Platinium','55':'Explodium','56':'Emerald','57':'Ruby','58':'Diamond','59':'Amazonite','5A':'Electronium','5B':'Unobtanium','64':'Mutant Skull','65':'Arm Bones','66':'Rib Bones','67':'Hip Bones','68':'Leg Bones','69':'Hammer','6A':'Scrap Metal','6B':'Beacon'};
var backgrounds = {'00':'Red','01':'Brown','02':'Grey','03':'Black'};
var image_filenames = ['0200.jpg','0201.jpg','0202.jpg','0203.jpg','1000.jpg','1001.jpg','1002.jpg','1003.jpg','1100.jpg','1101.jpg','1102.jpg','1103.jpg','1900.jpg','1901.jpg','1902.jpg','1903.jpg','1A00.jpg','1A01.jpg','1A02.jpg','1A03.jpg','1B00.jpg','1B01.jpg','1B02.jpg','1B03.jpg','1C00.jpg','1C01.jpg','1C02.jpg','1C03.jpg','1D00.jpg','1D01.jpg','1D02.jpg','1D03.jpg','2300.jpg','2301.jpg','2302.jpg','2303.jpg','2400.jpg','2401.jpg','2402.jpg','2403.jpg','2600.jpg','2601.jpg','2602.jpg','2603.jpg','2700.jpg','2701.jpg','2702.jpg','2703.jpg','2800.jpg','2801.jpg','2802.jpg','2803.jpg','2900.jpg','2901.jpg','2902.jpg','2903.jpg','5000.jpg','5001.jpg','5002.jpg','5003.jpg','5100.jpg','5101.jpg','5102.jpg','5103.jpg','5200.jpg','5201.jpg','5202.jpg','5203.jpg','5300.jpg','5301.jpg','5302.jpg','5303.jpg','5400.jpg','5401.jpg','5402.jpg','5403.jpg','5500.jpg','5501.jpg','5502.jpg','5503.jpg','5600.jpg','5601.jpg','5602.jpg','5603.jpg','5700.jpg','5701.jpg','5702.jpg','5703.jpg','5800.jpg','5801.jpg','5802.jpg','5803.jpg','5900.jpg','5901.jpg','5902.jpg','5903.jpg','5A00.jpg','5A01.jpg','5A02.jpg','5A03.jpg','5B00.jpg','5B01.jpg','5B02.jpg','5B03.jpg','6400.jpg','6401.jpg','6402.jpg','6403.jpg','6500.jpg','6501.jpg','6502.jpg','6503.jpg','6600.jpg','6601.jpg','6602.jpg','6603.jpg','6700.jpg','6701.jpg','6702.jpg','6703.jpg','6800.jpg','6801.jpg','6802.jpg','6803.jpg','6900.jpg','6901.jpg','6902.jpg','6903.jpg','6A00.jpg','6A01.jpg','6A02.jpg','6A03.jpg','6B00.jpg','6B01.jpg','6B02.jpg','6B03.jpg','Sky.jpg','Empty.jpg','Marker.jpg', 'Invisible.jpg', 'Alpha.png', 'Beta.png', 'Delta.png', 'Gamma.png', 'BossRoom.png', 'Surface.png'];
var START_BYTE = 24;
var TOTAL_ROWS;
var ROWS_PER_VIEW = 30;
var MAX_VIEW_ROWS;
var COLS_PER_ROW = 38;
var VIEW_COLS_PER_ROW = 36;
var IMG_SIZE = 30;
var INITIAL_ROW = 290; //Start at row 290, near surface level
var ROWS_ABOVE_SURFACE = 301;
var INGAME_DEPTH_RATIO = 12.5;

//Images
var images = {};
var images_loaded = 0;

//Instance variables
var keys = {control: false, shift: false};
var map = [];
var ctx;
var zoom_level = 1;
var current_row = 0;
var selected_tool;
var selected_cells = {};
var paste_cells = {};
var last_selected = false;
var overwrite_code;
var current_action = false;
var draw_allowed = false;
var safe_mode = true;

//Draw colours
var selected_color = "#00fffa";
var last_selected_color = "#0072ff";
var paste_color = "#9800ff";




function Point(row, col) {
    //A simple interface for a point
    this.row = row;
    this.col = col;
}

function Rectangle(startpoint, endpoint) {
    this.start = startpoint;
    this.end = endpoint;
}
Rectangle.prototype.contains = function(point) {
    return (point.row >= this.start.row && point.row <= this.end.row
        && point.col >= this.start.col && point.col <= this.end.col);
};

function Outpost(name, areas, edge_below) {
    this.name = name;

    var points = [];
    $.each(areas, function(i, area) {
        points.push(area.start);
        points.push(area.end);
    });
    var corners = findCorners(points);

    this.start_row = corners.startRow;
    this.end_row = corners.endRow;
    this.height = this.end_row - this.start_row + 1;

    this.start_col = corners.startCol;
    this.end_col = corners.endCol;
    this.width = this.end_col - this.start_col + 1;

    this.areas = areas;
    this.edge_below = edge_below;
}

var outposts = [
    new Outpost("Alpha", [
        new Rectangle(new Point(444, 12), new Point(444, 25)),
        new Rectangle(new Point(445, 1), new Point(447, 36))
    ], true),
    new Outpost("Beta", [
        new Rectangle(new Point(644, 12), new Point(645, 25)),
        new Rectangle(new Point(646, 1), new Point(647, 36))
    ], true),
    new Outpost("Gamma", [
        new Rectangle(new Point(762, 25), new Point(766, 32))
    ], false),
    new Outpost("Delta", [
        new Rectangle(new Point(894, 12), new Point(895, 25)),
        new Rectangle(new Point(896, 1), new Point(897, 36))
    ], true),
    new Outpost("BossRoom", [
        new Rectangle(new Point(1492, 4), new Point(1497, 33))
    ], false),
    new Outpost("", [ //This is the entire boss room, including the barriers, for safety
        new Rectangle(new Point(1490, 1), new Point(1500, 36))
    ], false),
    new Outpost("Marker", [
        new Rectangle(new Point(1501, 1), new Point(1501, 36))
    ], false),
    new Outpost("Surface", [
        new Rectangle(new Point(294, 1), new Point(300, 36))
    ], true)
];

function IconColor(fill, stroke) {
    this.fill = fill;
    this.stroke = stroke;
}
var icon_colors = [
    new IconColor('#3fffad', '#00c984'), //Green
    new IconColor('#ff6a7b', '#c92800'), //Red
    new IconColor('#2a9dff', '#1f5fff'), //Blue
    new IconColor('#e154ff', '#9300bf'), //Purple
    new IconColor('#ffb90a', '#f4a700') //Orange
]
var current_icon_color = icon_colors[0];
var ICON_COLOR_DELAY = 5000;
function Cell(code, color, row, col) {
    this.row = row;
    this.col = col;
    this.id = row * COLS_PER_ROW + col;
    this.selected = false;
    this.paste_code = 0;
    this.code = this.decode(code);
    this.color = this.decode(color);
    this.hexcode = this.code + this.color;
    this.modified = false;

    this.draw = true;
    this.is_outpost = false;
    this.is_edge = false;
    checkOutpost: { //Loop label
        for (var o = 0; o < outposts.length; o++) {
            var outpost = outposts[o];
            if (outpost.edge_below && this.row == outpost.end_row + 1) {
                this.is_edge = true;
                break checkOutpost;
            }
            for (var r = 0; r < outpost.areas.length; r++) {
                if (outpost.areas[r].contains(this)) {
                    this.is_outpost = true;
                    if (outpost.name != "") {
                        this.draw = false;
                    }
                    break checkOutpost;
                }
            }
        }
    }
}
Cell.prototype.decode = function(int) {
    var str = int.toString(16);
    while (str.length < 2) {
        str = "0" + str;
    }
    return str.toUpperCase();
};
Cell.prototype.encode = function(str) {
    return parseInt(str, 16);
};
Cell.prototype.updateCode = function(code) {
    if (this.isLocked()) {
        return;
    }
    this.modified = true;
    this.code = code;
    this.hexcode = this.code + this.color;
    if (!!last_selected && this.id == last_selected.id) {
        this.displayInfo();
    }
};
Cell.prototype.isLocked = function() {
    return (this.code == "FD" || (safe_mode && (this.code == "FE" || this.is_outpost)));
    //FD is marker, never allow overwrite, FE is Invisible Barrier, allow overwrite when unlocked
};
Cell.prototype.click = function() {
    if (current_action == "action_copy") {
        paste_cells = {};

        //Find starting row and column
        var corners = findCorners(selected_cells);
        var transformRow = this.row - corners.startRow;
        var transformCol = this.col - corners.startCol;
        var pcell;
        $.each(selected_cells, function(id, cell) {
            pcell = getCell(cell.row + transformRow, cell.col + transformCol, false);
            if (!!pcell) {
                pcell.paste_code = cell.code;
                paste_cells[pcell.id] = pcell;
            }
        });
    } else {
        if (keys.shift && !!last_selected) {
            var cellA = this;
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
            this.select(true, true); //Ensures that the target is last_selected as opposed to endRol, endCol
        } else if (keys.control) {
            this.select();
        } else {
            selected_cells = {};
            this.select();
        }
        if (selected_tool == "tool_overwrite") {
            replaceSelectedCells();
        }
    }

    //Update cell counts
    var selection_count = Object.keys(selected_cells).length;
    if (selection_count > 0) {
        var corners = findCorners(selected_cells);
        $("#info_selection_width").text(corners.endCol - corners.startCol + 1);
        $("#info_selection_height").text(corners.endRow - corners.startRow + 1);
    }
    $("#info_selection_total").text(selection_count);

    CheckActionState();
    Redraw();
};
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
        this.displayInfo();
    }
};
Cell.prototype.displayInfo = function() {
    $("#info_cell_row").text(this.row);
    $("#info_cell_column").text(this.col);
    $("#info_cell_hexcode").text(this.hexcode);
    $("#info_cell_material").text(materials[this.code.toString()]);
    $("#info_cell_color").text(backgrounds[this.color.toString()]);
    $("#info_cell_locked").text(this.isLocked() ? "Yes" : "No");
    if (this.isLocked()) {
        $("#info_cell_locked").addClass("locked");
    } else {
        $("#info_cell_locked").removeClass("locked");
    }
}
Cell.prototype.clear = function() {
    //Replace cell contents with default material for this position
    if (this.row < ROWS_ABOVE_SURFACE) {
        this.updateCode("FF"); //Sky
    } else if (this.is_edge) {
        this.updateCode("02"); //Empty (edge)
    } else {
        this.updateCode("01"); //Empty
    }
};
Cell.prototype.isSelected = function() {
    return (typeof selected_cells[this.id] != "undefined");
};
Cell.prototype.isPasting = function() {
    return (typeof paste_cells[this.id] != "undefined");
};
//Helper functions
function mapLoaded() {
    return (map.length > 0);
}

function getImage(code, hexcode) {
    if (code == "FE") {
        return "Invisible"; //FE is sky floor, and also first row of outposts (FE00, FE01, etc)
    } else if (code == "FD") {
        return "Marker";
    } else if (code == "FF") {
        return "Sky";
    } else if (code == "01") {
        return "Empty";
    } else {
        return hexcode;
    }
}

function getCell(row, col, getNearest) {
    if (!getNearest) {
        if (row < 0 || row >= TOTAL_ROWS || col < 1 || col > VIEW_COLS_PER_ROW) {
            return false;
        }
        return map[row][col];
    }
    if (row < 0) {
        row = 0;
    } else if (row >= TOTAL_ROWS) {
        row = TOTAL_ROWS - 1;
    }
    if (col < 1) {
        col = 1;
    } else if (col > VIEW_COLS_PER_ROW) {
        col = VIEW_COLS_PER_ROW;
    }
    return map[row][col];

}

function findCorners(selection) {
    var r = {
        startRow: 9999,
        startCol: 9999,
        endRow: 0,
        endCol: 0
    };
    $.each(selection, function(id, cell) {
        if (cell.row < r.startRow) {
            r.startRow = cell.row;
        }
        if (cell.row > r.endRow) {
            r.endRow = cell.row;
        }

        if (cell.col < r.startCol) {
            r.startCol = cell.col;
        }
        if (cell.col > r.endCol) {
            r.endCol = cell.col;
        }
    });
    return r;
}

function getRandomInt(min, max) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
//Canvas functions
function Redraw() {
    if (!draw_allowed) {
        return;
    }
    var zoom_img_size = IMG_SIZE * zoom_level;
    var viewable_selected_cells = [];
    ctx.clearRect(0, 0, $("#map").width, $("#map").height);

    //Draw special features (if applicable)
    $.each(outposts, function(i, outpost) {
        if (outpost.name == "") {
            return true; //Continue loop
        }
        if (current_row > outpost.start_row - ROWS_PER_VIEW && current_row <= outpost.end_row) {
            //Draw outpost
            var x = (outpost.start_col - 1) * zoom_img_size; //-1 to account for marker columns
            var y = (outpost.start_row - current_row) * zoom_img_size;
            ctx.drawImage(images[outpost.name], x, y, outpost.width * zoom_img_size, outpost.height * zoom_img_size);
        }
    });

    //Draw cells
    var cell;
    for (var row = 0; row < ROWS_PER_VIEW; row++) {
        for (var col = 0; col < VIEW_COLS_PER_ROW; col++) {
            cell = map[row + current_row][col + 1]; //Exclude marker columns
            var x = col * zoom_img_size;
            var y = row * zoom_img_size;
            if (cell.draw || cell.modified) { //Always draw overwritten cells
                try {
                    ctx.drawImage(images[getImage(cell.code, cell.hexcode)], x, y, zoom_img_size, zoom_img_size);
                } catch (err) {
                    console.error("Failed to draw " + cell.hexcode);
                }
            }
            if (cell.isSelected() || cell.isPasting()) {
                viewable_selected_cells.push({
                    cell: cell,
                    x: x,
                    y: y
                });
            }
        }
    }

    //Draw cell outlines last
    $.each(viewable_selected_cells, function(i, outline) {
        ctx.strokeStyle = selected_color;
        if (outline.cell.id == last_selected.id) {
            ctx.strokeStyle = last_selected_color;
        } else if (outline.cell.isPasting()) {
            ctx.strokeStyle = paste_color;
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(outline.x + 0.5, outline.y + 0.5, zoom_img_size - 1, zoom_img_size - 1);
    });
}

function UpdateCanvasSize() {
    var canvas = $("#map")[0];
    var max_height = $(window).height() - $("#header").outerHeight(true) - $("#footer").outerHeight(true) - 20;
    ROWS_PER_VIEW = Math.floor(max_height / (IMG_SIZE * zoom_level));
    var newwidth = VIEW_COLS_PER_ROW * IMG_SIZE * zoom_level;
    var newheight = ROWS_PER_VIEW * IMG_SIZE * zoom_level;

    canvas.width = newwidth;
    canvas.height = newheight;
    $("#map_scrollcontrols").css({height: newheight});
    ctx = canvas.getContext('2d');
    Redraw();
}

function CanvasClick(e) {
    var targetRow = current_row + Math.floor(e.offsetY / (IMG_SIZE * zoom_level));
    var targetCol = Math.floor(e.offsetX / (IMG_SIZE * zoom_level)) + 1; //Add one to account for marker
    var target = map[targetRow][targetCol];
    target.click();
}

function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val());
    UpdateCanvasSize();
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
    event.preventDefault();
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
        UpdateCurrentRow(current_row + 1);
    } else if (id == "map_downmany") {
        UpdateCurrentRow(current_row + SCROLL_MANY);
    }
}

function UpdateCurrentRow(newvalue) {
    //console.log("Current row: " + newvalue);
    if (newvalue < 0) {
        current_row = 0;
    } else if (newvalue > MAX_VIEW_ROWS) {
        current_row = MAX_VIEW_ROWS;
    } else {
        current_row = newvalue;
    }
    $("#map_scrollbar").slider("value", MAX_VIEW_ROWS - newvalue);
    $("#map_scrollbar .ui-slider-handle").text(current_row);
    $("#input_current_row").val(current_row);
    var current_row_relative = ROWS_ABOVE_SURFACE - current_row;
    $("#input_current_depth").val(current_row_relative * INGAME_DEPTH_RATIO);
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
}

function SelectTool() {
    selected_tool = $(this).attr('id');
    $(".button-tool").removeClass("ui-state-active");
    $(this).addClass("ui-state-active");
    if (selected_tool == "tool_overwrite") {
        $("#map").addClass("cursor-pointer");
    } else {
        $("#map").removeClass("cursor-pointer");
    }
}

function replaceSelectedCells() {
    $.each(selected_cells, function(id, cell) {
        cell.updateCode(overwrite_code);
    });
    Redraw();
}

function SelectAction() {
    if ($(this).hasClass("ui-state-disabled")) {
        return;
    }
    var action = $(this).attr("id");
    if (action == "action_replace") {
        replaceSelectedCells();
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
        selected_cells = paste_cells;
        paste_cells = {};
        Redraw();
        current_action = false;
    } else if (action == "action_clear") {
        $.each(selected_cells, function(id, cell) {
            cell.clear();
        });
        Redraw();
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
        $("#action_copy span").text("Cancel");
        $("#action_replace").addClass("ui-state-disabled");
        $(".button-action:not(#action_replace)").removeClass("ui-state-disabled");
    } else {
        $("#action_copy span").text("Copy");
    }
}

function KeypressHandler(e) {
    var pressed = (e.type == "keydown");
    var key = e.which;

    //Save current state for other functions
    if (key == 16) { //Shift
        keys.shift = pressed;
        return;
    } else if (key == 17) { //Ctrl
        keys.control = pressed;
        return;
    }

    //Otherwise, handle immediately
    if (!pressed) {
        return;
    }

    if (keys.control == true) {
        if (key == 67) { //C
            $("#action_copy").click();
            return;
        } else if (key == 86) { //V
            $("#action_paste").click();
            return;
        }
    }

    if ((key == 33 || key == 34 || key >= 37 && key <= 40) && !!last_selected) { //Arrow keys
        var move_row = 0;
        var move_col = 0;

        if (key == 37) { //Left
            move_col = -1;
        } else if (key == 38) { //Up
            move_row = -1;
        } else if (key == 39) { //Right
            move_col = 1;
        } else if (key == 40) { //Down
            move_row = 1;
        } else if (key == 33) { //Page Up
            move_row = -10;
        } else if (key == 34) { //Page Down
            move_row = 10;
        }
        var target = getCell(last_selected.row + move_row, last_selected.col + move_col, true);
        //Check if we've gone off the viewport
        if (target.row < current_row || target.row >= current_row + ROWS_PER_VIEW) {
            UpdateCurrentRow(current_row + move_row);
        }
        target.click();
        return;
    }

    if (key == 45) { //Insert
        replaceSelectedCells();
        return;
    } else if (key == 46) { //Delete
        $("#action_clear").click();
        return;
    }

    console.log(key);
}

function IconColorChange() {
    var newcolor = 0;
    while (newcolor == 0 || newcolor.fill == current_icon_color.fill) {
         newcolor = icon_colors[getRandomInt(0, icon_colors.length)];
    }
    current_icon_color = newcolor;
    $("#header_logo").attr(newcolor); //Sets attributes
}

function ShowLoadWarning(warning) {
    $("#load_splash_content").addClass("text-danger");
    $("#load_splash_icon").hide();
    $("#load_splash_warning").show();
    $("#load_splash_message").text(warning);
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
    if (images_loaded == image_filenames.length) {
        console.log("Image load complete");
        Setup();
    }
}

function LoadFile() {
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

function SaveFile() {
    var data = [];
    var file;
    var cell;
    for (var row = 0; row < map.length; row++) {
        for (var col = 0; col < COLS_PER_ROW; col++) {
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

function LoadDefaultMap() {
    /* Loading arrayBuffers using AJAX is not supported by jQuery, use native XMLHttpRequest instead:
     * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
     */
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "sample_map", true);
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
    map = [];
    var cells = [];
    var row = 0;
    var col = 0;
    var val;
    for (var i = 0; i <= rawmap.length - 2; i += 2) { //Go in blocks of two 8 bit numbers
        cells.push(new Cell(rawmap[i], rawmap[i + 1], row, col));
        col++;
        if (col == COLS_PER_ROW) {
            col = 0;
            row++;
            map.push(cells);
            cells = [];
        }
    }

    //Initialize some stuff
    TOTAL_ROWS = map.length;
    MAX_VIEW_ROWS = TOTAL_ROWS - ROWS_PER_VIEW;
    current_row = INITIAL_ROW;
    $("#input_current_row").attr("max", MAX_VIEW_ROWS).val(INITIAL_ROW);
    $("#input_current_depth").attr({min: -(MAX_VIEW_ROWS - ROWS_ABOVE_SURFACE) * INGAME_DEPTH_RATIO,
        max: ROWS_ABOVE_SURFACE * INGAME_DEPTH_RATIO
    });
    CreateScrollbar();
    UpdateCurrentRow(INITIAL_ROW);

    draw_allowed = true;
    ZoomUpdate();
    map[ROWS_ABOVE_SURFACE][1].click(); //Click the first ground cell, so we can start keyboard navigation


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
        var row = -(Math.round(parseFloat($(this).val()) / INGAME_DEPTH_RATIO)) + ROWS_ABOVE_SURFACE;
        UpdateCurrentRow(row);
    });
}
//Insertion point
$(function() {
    // Check for the various File API support.
    if (!(window.File && window.FileReader)) {
        ShowLoadWarning("This browser doesn't support the JavaScript File APIs.");
        return;
    }

    setInterval(IconColorChange, ICON_COLOR_DELAY);
    LoadImages();
});

function Setup() {
    //Runs after load images is complete
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").change(LoadFile);
    $("#map_zoom").change(ZoomUpdate);
    $(window).resize(UpdateCanvasSize);

    $(".button-tool").click(SelectTool);
    $("#tool_select").click();

    $(".button-action").click(SelectAction);
    CheckActionState();

    $("#map_materials_container .material-container").click(SelectMaterial);
    $("#current_material_container").popover({
        content: $("#map_materials_container"),
        html: true,
        title: "Select a material",
        trigger: "focus"
    });
    $("#help_safemode").tooltip({
        title: "Safe mode prevents certain important tiles being edited. See help for more info."
    });
    $("#input_safemode").bootstrapSwitch({
        onColor: "success",
        offColor: "danger",
        onText: "On",
        offText: "Off",
        onSwitchChange: function(event, state) {
            safe_mode = state;
            if (!!last_selected) {
                last_selected.displayInfo();
            }
        }
    })
    $(".material-container:first-child").click(); //Select first material as default
    //$("#current_material_container").click(OpenMaterialPanel);

    $(document).on('keyup keydown', KeypressHandler);
    LoadDefaultMap();
}
