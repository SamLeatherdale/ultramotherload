//UI functions
import { throttle } from "lodash";
import { Redraw } from "./canvas";
import * as globals from "./globals";
import { getCell, getImage, getRandomInt } from "./helper";
import { state } from "./globals";

export function CreateScrollbar() {
    var handle = $("#map_scrollbar .ui-slider-handle");
    $("#map_scrollbar").slider({
        orientation: "vertical",
        range: "min",
        min: 0,
        max: state.max_view_rows,
        value: state.max_view_rows - state.current_row,
        create: function () {
            handle.text(state.max_view_rows - $(this).slider("value"));
        },
        slide: function (event, ui) {
            UpdateCurrentRow(state.max_view_rows - (ui.value || 0), true);
        },
        stop: function (event, ui) {},
    });
}

export function ScrollbarOnScroll(
    event: JQueryMousewheel.JQueryMousewheelEventObject,
) {
    event.preventDefault();
    var SCROLL_FACTOR = 5;
    var newvalue = state.current_row - event.deltaY * SCROLL_FACTOR;
    UpdateCurrentRow(newvalue, true);
}

export function ScrollButtonOnClick(target: HTMLElement) {
    var SCROLL_MANY = 20;
    var id = $(target).attr("id");
    if (id == "map_upmany") {
        UpdateCurrentRow(state.current_row - SCROLL_MANY);
    } else if (id == "map_upone") {
        UpdateCurrentRow(state.current_row - 1);
    } else if (id == "map_downone") {
        UpdateCurrentRow(state.current_row + 1);
    } else if (id == "map_downmany") {
        UpdateCurrentRow(state.current_row + SCROLL_MANY);
    }
}

const throttledRedraw = throttle(Redraw, 16, {
    leading: true,
    trailing: true,
});

export function UpdateCurrentRow(newvalue: number, debounce?: boolean) {
    //console.log("Current row: " + newvalue);
    if (newvalue < 0) {
        state.current_row = 0;
    } else if (newvalue > state.max_view_rows) {
        state.current_row = state.max_view_rows;
    } else {
        state.current_row = newvalue;
    }
    $("#map_scrollbar").slider("value", state.max_view_rows - newvalue);
    $("#map_scrollbar .ui-slider-handle").text(state.current_row);
    $("#input_current_row").val(state.current_row);
    $("#max_rows").text(`/ ${state.max_view_rows}`);
    const current_row_relative = globals.ROWS_ABOVE_SURFACE - state.current_row;
    $("#input_current_depth").val(
        Math.round(current_row_relative * globals.INGAME_DEPTH_RATIO),
    );
    if (debounce) {
        throttledRedraw();
    } else {
        Redraw();
    }
}

export function CreateMaterialsPanel() {
    Object.entries(globals.materials).forEach(([code, name]) => {
        const m = $(".material-container:first-child").clone();
        m.attr("data-code", code);
        m.find(".material-icon").css({
            backgroundImage: "url(res/" + getImage(code, code + "00") + ".jpg)",
        });
        m.find(".material-title").text(name);
        $("#map_materials_container").append(m);
    });
    $(".material-container:first-child").remove(); //Remove template material
}

let overwrite_code: string;

export function SelectMaterial(target: HTMLElement) {
    $("#current_material_container").empty();
    $(target).clone().appendTo($("#current_material_container"));
    overwrite_code = $(target).attr("data-code") as string;
}

export function SelectTool(target: HTMLElement) {
    state.selected_tool = $(target).attr("id") as string;
    $(".button-tool").removeClass("ui-state-active");
    $(target).addClass("ui-state-active");
    if (state.selected_tool == "tool_overwrite") {
        $("#map").addClass("cursor-pointer");
    } else {
        $("#map").removeClass("cursor-pointer");
    }
}

export function replaceSelectedCells() {
    $.each(state.selected_cells, function (id, cell) {
        cell.updateCode(overwrite_code);
    });
    Redraw();
}

export function SelectAction(target: HTMLElement) {
    if ($(target).hasClass("ui-state-disabled")) {
        return;
    }
    const action = $(target).attr("id");
    if (action == "action_replace") {
        replaceSelectedCells();
    } else if (action == "action_copy") {
        if (state.current_action == "action_copy") {
            //We are cancelling copy
            state.current_action = undefined;
            state.paste_cells = {};
            Redraw();
        } else {
            state.current_action = "action_copy";
            state.paste_cells = state.selected_cells;
            Redraw();
        }
    } else if (action == "action_paste") {
        $.each(state.paste_cells, function (id, cell) {
            cell.updateCode(cell.paste_code);
            cell.paste_code = "";
        });
        state.selected_cells = state.paste_cells;
        state.paste_cells = {};
        Redraw();
        state.current_action = undefined;
    } else if (action == "action_clear") {
        $.each(state.selected_cells, function (id, cell) {
            cell.clear();
        });
        Redraw();
    }
    CheckActionState();
}

export function CheckActionState() {
    if (Object.keys(state.selected_cells).length == 0) {
        $(".button-action").addClass("ui-state-disabled");
    } else {
        $("#action_paste").addClass("ui-state-disabled");
        $(".button-action:not(#action_paste)").removeClass("ui-state-disabled");
    }
    if (state.current_action == "action_copy") {
        $("#action_copy span").text("Cancel");
        $("#action_replace").addClass("ui-state-disabled");
        $(".button-action:not(#action_replace)").removeClass(
            "ui-state-disabled",
        );
    } else {
        $("#action_copy span").text("Copy");
    }
}

export function KeypressHandler(type: string, key: number) {
    const pressed = type == "keydown";

    //Save current state for other functions
    if (key == 16) {
        //Shift
        globals.keys.shift = pressed;
        return;
    } else if (key == 17) {
        //Ctrl
        globals.keys.control = pressed;
        return;
    }

    //Otherwise, handle immediately
    if (!pressed) {
        return;
    }

    if (globals.keys.control) {
        if (key == 67) {
            //C
            $("#action_copy").click();
            return;
        } else if (key == 86) {
            //V
            $("#action_paste").click();
            return;
        }
    }

    if (
        (key == 33 || key == 34 || (key >= 37 && key <= 40)) &&
        !!state.last_selected
    ) {
        //Arrow keys
        var move_row = 0;
        var move_col = 0;

        if (key == 37) {
            //Left
            move_col = -1;
        } else if (key == 38) {
            //Up
            move_row = -1;
        } else if (key == 39) {
            //Right
            move_col = 1;
        } else if (key == 40) {
            //Down
            move_row = 1;
        } else if (key == 33) {
            //Page Up
            move_row = -10;
        } else if (key == 34) {
            //Page Down
            move_row = 10;
        }
        var target = getCell(
            state.last_selected.row + move_row,
            state.last_selected.col + move_col,
            true,
        );
        if (!target) {
            console.warn("Cell out of range");
            return;
        }
        //Check if we've gone off the viewport
        if (
            target.row < state.current_row ||
            target.row >= state.current_row + state.rows_per_view
        ) {
            UpdateCurrentRow(state.current_row + move_row);
        }
        target.click();
        return;
    }

    if (key == 45) {
        //Insert
        replaceSelectedCells();
        return;
    } else if (key == 46) {
        //Delete
        $("#action_clear").click();
        return;
    }

    console.log(key);
}

class IconColor {
    constructor(
        public fill: string,
        public stroke: string,
    ) {}
}

export var icon_colors = [
    new IconColor("#3fffad", "#00c984"), //Green
    new IconColor("#ff6a7b", "#c92800"), //Red
    new IconColor("#2a9dff", "#1f5fff"), //Blue
    new IconColor("#e154ff", "#9300bf"), //Purple
    new IconColor("#ffb90a", "#f4a700"), //Orange
];
export var current_icon_color = icon_colors[0];

export function IconColorChange() {
    let newcolor: IconColor | undefined = undefined;
    while (!newcolor || newcolor.fill == current_icon_color.fill) {
        newcolor = icon_colors[getRandomInt(0, icon_colors.length)];
    }
    current_icon_color = newcolor;
    $("#header_logo").attr(newcolor); //Sets attributes
}

export function ShowLoadWarning(warning: string) {
    $("#load_splash_content").addClass("text-danger");
    $("#load_splash_icon").hide();
    $("#load_splash_warning").show();
    $("#load_splash_message").text(warning);
}
