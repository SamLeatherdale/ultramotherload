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
