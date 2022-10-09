

//Constants
import { findCorners } from "./helper";

export const writeGlobals = {
    TOTAL_ROWS: undefined,
    ROWS_PER_VIEW: 30,
    MAX_VIEW_ROWS: undefined,
    map: [],
    current_row: 0,
    selected_tool: undefined,
    selected_cells: {},
    paste_cells: {},
    last_selected: false,
    safe_mode: true
}
export var materials = {'FE':'Invisible Barrier','FF':'Sky','01':'Empty','02':'Empty (edge)','10':'Dirt','11':'Dirt (edge)','19':'Rock','1A':'Metal Plate','1B':'Molten Plate','1C':'Magma','1D':'Barrier','23':'Fuel','24':'Repair','26':'TNT','27':'C4','28':'Shaft Bomb','29':'T Bomb','50':'Ironium','51':'Bronzium','52':'Silverium','53':'Goldium','54':'Platinium','55':'Explodium','56':'Emerald','57':'Ruby','58':'Diamond','59':'Amazonite','5A':'Electronium','5B':'Unobtanium','64':'Mutant Skull','65':'Arm Bones','66':'Rib Bones','67':'Hip Bones','68':'Leg Bones','69':'Hammer','6A':'Scrap Metal','6B':'Beacon'};
export var START_BYTE = 24;
export var COLS_PER_ROW = 38;
export var VIEW_COLS_PER_ROW = 36;
export var INITIAL_ROW = 290; //Start at row 290, near surface level
export var ROWS_ABOVE_SURFACE = 301;
export var INGAME_DEPTH_RATIO = 12.5;

//Images
export var images = {};

//Instance export variables
export var keys = {control: false, shift: false};

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

export var outposts = [
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

