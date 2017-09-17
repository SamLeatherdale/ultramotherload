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
