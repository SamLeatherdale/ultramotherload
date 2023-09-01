import { Redraw } from "./canvas";
import * as globals from "./globals";
import { findCorners, getCell } from "./helper";
import { CheckActionState, replaceSelectedCells } from "./ui";
import { state } from "./globals";
import { CellLike } from "./classes";

export class Cell implements CellLike {
    public row: number;
    public col: number;
    public id: number;
    public selected: boolean;
    public paste_code: string;
    public code: string;
    public color: string;
    public hexcode: string;
    public modified: boolean;
    public draw: boolean;
    public is_outpost: boolean;
    public is_edge: boolean;
    constructor(code: number, color: number, row: number, col: number) {
        this.row = row;
        this.col = col;
        this.id = row * globals.COLS_PER_ROW + col;
        this.selected = false;
        this.paste_code = "";
        this.code = this.decode(code);
        this.color = this.decode(color);
        this.hexcode = this.code + this.color;
        this.modified = false;

        this.draw = true;
        this.is_outpost = false;
        this.is_edge = false;
        checkOutpost: {
            //Loop label
            for (var o = 0; o < globals.OUTPOSTS.length; o++) {
                var outpost = globals.OUTPOSTS[o];
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

    decode(int: number) {
        let str = int.toString(16);
        while (str.length < 2) {
            str = "0" + str;
        }
        return str.toUpperCase();
    }

    encode(str: string) {
        return parseInt(str, 16);
    }

    updateCode(code: string) {
        if (this.isLocked()) {
            return;
        }
        this.modified = true;
        this.code = code;
        this.hexcode = this.code + this.color;
        if (!!state.last_selected && this.id == state.last_selected.id) {
            this.displayInfo();
        }
    }

    isLocked() {
        return (
            this.code == "FD" ||
            (state.safe_mode && (this.code == "FE" || this.is_outpost))
        );
        //FD is marker, never allow overwrite, FE is Invisible Barrier, allow overwrite when unlocked
    }

    click() {
        if (state.current_action == "action_copy") {
            state.paste_cells = {};

            //Find starting row and column
            const corners = findCorners(state.selected_cells);
            const transformRow = this.row - corners.startRow;
            const transformCol = this.col - corners.startCol;
            let pcell: false | Cell;
            $.each(state.selected_cells, function (id, cell) {
                pcell = getCell(
                    cell.row + transformRow,
                    cell.col + transformCol,
                    false,
                );
                if (!!pcell) {
                    pcell.paste_code = cell.code;
                    state.paste_cells[pcell.id] = pcell;
                }
            });
        } else {
            if (globals.keys.shift && !!state.last_selected) {
                var cellA = this;
                var cellB = state.last_selected;
                //cellB.select(); //Flip original first, so it matches the other tiles
                var startRow = cellA.row < cellB.row ? cellA.row : cellB.row;
                var startCol = cellA.col < cellB.col ? cellA.col : cellB.col;
                var endRow = cellA.row > cellB.row ? cellA.row : cellB.row;
                var endCol = cellA.col > cellB.col ? cellA.col : cellB.col;
                for (var row = startRow; row <= endRow; row++) {
                    for (var col = startCol; col <= endCol; col++) {
                        state.map[row][col].select(false, true);
                    }
                }
                this.select(true, true); //Ensures that the target is last_selected as opposed to endRol, endCol
            } else if (globals.keys.control) {
                this.select();
            } else {
                state.selected_cells = {};
                this.select();
            }
            if (state.selected_tool === "tool_overwrite") {
                replaceSelectedCells();
            }
        }

        //Update cell counts
        var selection_count = Object.keys(state.selected_cells).length;
        if (selection_count > 0) {
            var corners = findCorners(state.selected_cells);
            $("#info_selection_width").text(
                corners.endCol - corners.startCol + 1,
            );
            $("#info_selection_height").text(
                corners.endRow - corners.startRow + 1,
            );
        }
        $("#info_selection_total").text(selection_count);

        CheckActionState();
        Redraw();
    }

    select(lastSelected?: boolean, force?: boolean) {
        lastSelected = lastSelected || true;
        force = force || false;
        if (force || !this.isSelected()) {
            state.selected_cells[this.id] = this;
        } else {
            delete state.selected_cells[this.id];
        }
        if (lastSelected) {
            state.last_selected = this;
            this.displayInfo();
        }
    }

    displayInfo() {
        $("#info_cell_row").text(this.row);
        $("#info_cell_column").text(this.col);
        $("#info_cell_hexcode").text(this.hexcode);
        $("#info_cell_material").text(globals.materials[this.code.toString()]);
        $("#info_cell_color").text(backgrounds[this.color.toString()]);
        $("#info_cell_locked").text(this.isLocked() ? "Yes" : "No");
        if (this.isLocked()) {
            $("#info_cell_locked").addClass("locked");
        } else {
            $("#info_cell_locked").removeClass("locked");
        }
    }

    clear() {
        //Replace cell contents with default material for this position
        if (this.row < globals.ROWS_ABOVE_SURFACE) {
            this.updateCode("FF"); //Sky
        } else if (this.is_edge) {
            this.updateCode("02"); //Empty (edge)
        } else {
            this.updateCode("01"); //Empty
        }
    }

    isSelected() {
        return typeof state.selected_cells[this.id] != "undefined";
    }

    isPasting() {
        return typeof state.paste_cells[this.id] != "undefined";
    }
}
const backgrounds: { [key: string]: string } = {
    "00": "Red",
    "01": "Brown",
    "02": "Grey",
    "03": "Black",
};
