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
