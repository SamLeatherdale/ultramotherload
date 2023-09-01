//Helper functions
import * as globals from "./globals";
import { state } from "./globals";
import { Cell } from "./cell";
import { CellLike } from "./classes";
export function getImage(code: string, hexcode: string) {
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

export function getCell(row: number, col: number, getNearest: boolean) {
    if (!getNearest) {
        if (
            row < 0 ||
            row >= state.total_rows ||
            col < 1 ||
            col > globals.VIEW_COLS_PER_ROW
        ) {
            return false;
        }
        return state.map[row][col];
    }
    if (row < 0) {
        row = 0;
    } else if (row >= state.total_rows) {
        row = state.total_rows - 1;
    }
    if (col < 1) {
        col = 1;
    } else if (col > globals.VIEW_COLS_PER_ROW) {
        col = globals.VIEW_COLS_PER_ROW;
    }
    return state.map[row][col];
}

export function findCorners(
    selection: { [key: number]: CellLike } | CellLike[],
) {
    var r = {
        startRow: 9999,
        startCol: 9999,
        endRow: 0,
        endCol: 0,
    };
    $.each(selection, function (id, cell) {
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

export function getRandomInt(min: number, max: number) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}
