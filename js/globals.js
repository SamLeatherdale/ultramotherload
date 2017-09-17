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
