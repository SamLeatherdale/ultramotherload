//Helper functions
import * as globals from "./globals";

export function mapLoaded() {
    return (globals.writeGlobals.map.length > 0);
}

export function getImage(code, hexcode) {
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

export function getCell(row, col, getNearest) {
    if (!getNearest) {
        if (row < 0 || row >= globals.writeGlobals.TOTAL_ROWS || col < 1 || col > globals.VIEW_COLS_PER_ROW) {
            return false;
        }
        return map[row][col];
    }
    if (row < 0) {
        row = 0;
    } else if (row >= globals.writeGlobals.TOTAL_ROWS) {
        row = globals.writeGlobals.TOTAL_ROWS - 1;
    }
    if (col < 1) {
        col = 1;
    } else if (col > globals.VIEW_COLS_PER_ROW) {
        col = globals.VIEW_COLS_PER_ROW;
    }
    return map[row][col];

}

export function findCorners(selection) {
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

export function getRandomInt(min, max) {
    //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

/**
 * @see https://stackoverflow.com/questions/27078285/simple-throttle-in-javascript
 */
export function throttle(callback, limit) {
    var waiting = false;                      // Initially, we're not waiting
    return function () {                      // We return a throttled function
        if (!waiting) {                       // If we're not waiting
            callback.apply(this, arguments);  // Execute users function
            waiting = true;                   // Prevent future invocations
            setTimeout(function () {          // After a period of time
                waiting = false;              // And allow future invocations
            }, limit);
        }
    }
}