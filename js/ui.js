//UI functions
import { Redraw } from "./canvas";
import * as globals from "./globals";
import { getCell, getImage, getRandomInt, throttle } from "./helper";

export function CreateScrollbar() {
    var handle = $("#map_scrollbar .ui-slider-handle");
    $("#map_scrollbar").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: globals.writeGlobals.MAX_VIEW_ROWS,
        value: globals.writeGlobals.MAX_VIEW_ROWS - globals.writeGlobals.current_row,
        create: function() {
            handle.text(globals.writeGlobals.MAX_VIEW_ROWS - $(this).slider("value"));
        },
        slide: function(event, ui) {
            UpdateCurrentRow(globals.writeGlobals.MAX_VIEW_ROWS - ui.value, true);
        },
        stop: function(event, ui) {

        }
    });
}

export function ScrollbarOnScroll(event) {
    event.preventDefault();
    var SCROLL_FACTOR = 5;
    var newvalue = globals.writeGlobals.current_row - event.deltaY * SCROLL_FACTOR;
    UpdateCurrentRow(newvalue, true);
}

export function ScrollButtonOnClick(event) {
    var SCROLL_MANY = 20;
    var id = $(this).attr("id");
    if (id == "map_upmany") {
        UpdateCurrentRow(globals.writeGlobals.current_row - SCROLL_MANY);
    } else if (id == "map_upone") {
        UpdateCurrentRow(globals.writeGlobals.current_row - 1);
    } else if (id == "map_downone") {
        UpdateCurrentRow(globals.writeGlobals.current_row + 1);
    } else if (id == "map_downmany") {
        UpdateCurrentRow(globals.writeGlobals.current_row + SCROLL_MANY);
    }
}

const throttledRedraw = throttle(Redraw, 16)

export function UpdateCurrentRow(newvalue, debounce) {
    //console.log("Current row: " + newvalue);
    if (newvalue < 0) {
        globals.writeGlobals.current_row = 0;
    } else if (newvalue > globals.writeGlobals.MAX_VIEW_ROWS) {
        globals.writeGlobals.current_row = globals.writeGlobals.MAX_VIEW_ROWS;
    } else {
        globals.writeGlobals.current_row = newvalue;
    }
    $("#map_scrollbar").slider("value", globals.writeGlobals.MAX_VIEW_ROWS - newvalue);
    $("#map_scrollbar .ui-slider-handle").text(globals.writeGlobals.current_row);
    $("#input_current_row").val(globals.writeGlobals.current_row);
    var current_row_relative = globals.ROWS_ABOVE_SURFACE - globals.writeGlobals.current_row;
    $("#input_current_depth").val(current_row_relative * globals.INGAME_DEPTH_RATIO);
    if (debounce) {
        throttledRedraw();
    } else {
        Redraw();
    }
}

export function CreateMaterialsPanel() {
    var m;
    $.each(globals.materials, function(code, name) {
        m = $(".material-container:first-child").clone();
        m.attr("data-code", code);
        m.find(".material-icon").css({backgroundImage: "url(res/" + getImage(code, code + "00") +".jpg)"});
        m.find(".material-title").text(name);
        $("#map_materials_container").append(m);
    });
    $(".material-container:first-child").remove(); //Remove template material
}

export var overwrite_code;

export function SelectMaterial() {
    $("#current_material_container").empty();
    $(this).clone().appendTo($("#current_material_container"));
    overwrite_code = $(this).attr("data-code");
}

export function SelectTool() {
    globals.writeGlobals.selected_tool = $(this).attr('id');
    $(".button-tool").removeClass("ui-state-active");
    $(this).addClass("ui-state-active");
    if (globals.writeGlobals.selected_tool == "tool_overwrite") {
        $("#map").addClass("cursor-pointer");
    } else {
        $("#map").removeClass("cursor-pointer");
    }
}

export function replaceSelectedCells() {
    $.each(globals.writeGlobals.selected_cells, function(id, cell) {
        cell.updateCode(overwrite_code);
    });
    Redraw();
}

export var current_action = false;

export function SelectAction() {
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
            globals.writeGlobals.paste_cells = {};
            Redraw();
        } else {
            current_action = "action_copy";
            globals.writeGlobals.paste_cells = globals.writeGlobals.selected_cells;
            Redraw();
        }
    } else if (action == "action_paste") {
        $.each(globals.writeGlobals.paste_cells, function(id, cell) {
            cell.updateCode(cell.paste_code);
            cell.paste_code = 0;
        });
        globals.writeGlobals.selected_cells = globals.writeGlobals.paste_cells;
        globals.writeGlobals.paste_cells = {};
        Redraw();
        current_action = false;
    } else if (action == "action_clear") {
        $.each(globals.writeGlobals.selected_cells, function(id, cell) {
            cell.clear();
        });
        Redraw();
    }
    CheckActionState();
}

export function CheckActionState() {
    if (Object.keys(globals.writeGlobals.selected_cells).length == 0) {
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

export function KeypressHandler(e) {
    var pressed = (e.type == "keydown");
    var key = e.which;

    //Save current state for other functions
    if (key == 16) { //Shift
        globals.keys.shift = pressed;
        return;
    } else if (key == 17) { //Ctrl
        globals.keys.control = pressed;
        return;
    }

    //Otherwise, handle immediately
    if (!pressed) {
        return;
    }

    if (globals.keys.control == true) {
        if (key == 67) { //C
            $("#action_copy").click();
            return;
        } else if (key == 86) { //V
            $("#action_paste").click();
            return;
        }
    }

    if ((key == 33 || key == 34 || key >= 37 && key <= 40) && !!globals.writeGlobals.last_selected) { //Arrow keys
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
        var target = getCell(globals.writeGlobals.last_selected.row + move_row, globals.writeGlobals.last_selected.col + move_col, true);
        //Check if we've gone off the viewport
        if (target.row < globals.writeGlobals.current_row || target.row >= globals.writeGlobals.current_row + globals.writeGlobals.ROWS_PER_VIEW) {
            UpdateCurrentRow(globals.writeGlobals.current_row + move_row);
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

function IconColor(fill, stroke) {
    this.fill = fill;
    this.stroke = stroke;
}

export var icon_colors = [
    new IconColor('#3fffad', '#00c984'), //Green
    new IconColor('#ff6a7b', '#c92800'), //Red
    new IconColor('#2a9dff', '#1f5fff'), //Blue
    new IconColor('#e154ff', '#9300bf'), //Purple
    new IconColor('#ffb90a', '#f4a700') //Orange
]
export var current_icon_color = icon_colors[0];

export function IconColorChange() {
    var newcolor = 0;
    while (newcolor == 0 || newcolor.fill == current_icon_color.fill) {
         newcolor = icon_colors[getRandomInt(0, icon_colors.length)];
    }
    current_icon_color = newcolor;
    $("#header_logo").attr(newcolor); //Sets attributes
}

export function ShowLoadWarning(warning) {
    $("#load_splash_content").addClass("text-danger");
    $("#load_splash_icon").hide();
    $("#load_splash_warning").show();
    $("#load_splash_message").text(warning);
}
