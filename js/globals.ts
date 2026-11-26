//Constants
import { Cell } from "./cell";
import { Outpost, Point, Rectangle } from "./classes";

type Actions =
    | "action_copy"
    | "action_paste"
    | "action_delete"
    | "action_replace"
    | "action_fill"
    | "action_clear";
export const state: {
    total_rows: number;
    rows_per_view: number;
    max_view_rows: number;
    map: Cell[][];
    current_action: Actions | undefined;
    current_row: number;
    selected_tool: string;
    selected_cells: { [key: number]: Cell };
    paste_cells: { [key: number]: Cell };
    last_selected: Cell | undefined;
    safe_mode: boolean;
} = {
    total_rows: 0,
    rows_per_view: 30,
    max_view_rows: 0,
    map: [],
    current_row: 0,
    current_action: undefined,
    selected_tool: "",
    selected_cells: {},
    paste_cells: {},
    last_selected: undefined,
    safe_mode: true,
};
export const MATERIAL_CATEGORIES = {
    Metals: {
        "50": "Ironium",
        "51": "Bronzium",
        "52": "Silverium",
        "53": "Goldium",
        "54": "Platinium",
        "55": "Explodium",
        "5A": "Electronium",
        "5B": "Unobtainium",
    },
    Gems: {
        "56": "Emerald",
        "57": "Ruby",
        "58": "Diamond",
        "59": "Amazonite",
    },
    "Bones & Relics": {
        "64": "Mutant Skull",
        "65": "Arm Bones",
        "66": "Rib Bones",
        "67": "Hip Bones",
        "68": "Leg Bones",
        "69": "Hammer",
        "6A": "Scrap Metal (Sickle)",
        "6B": "Broken Beacon",
    },
    "Pickups & Bombs": {
        "23": "Fuel",
        "24": "Repair",
        "26": "TNT",
        "27": "C4",
        "28": "Shaft Bomb",
        "29": "T Bomb",
    },
    "Terrain & Level": {
        FF: "Sky",
        "01": "Empty",
        "02": "Empty (edge)",
        "10": "Dirt",
        "11": "Dirt (edge)",
    },
    Obstacles: {
        "19": "Rock",
        "1A": "Metal Plate",
        "1B": "Molten Plate",
        "1C": "Magma",
        "1D": "Bedrock",
        FE: "Invisible Barrier",
    },
    Experimental: {
        "12": "Dirt (edge B)",
        "25": "Speed Boost (unused)",
        "2A": "Blueprints (unused)",
        FD: "Out of Bounds",
    },
} as const;

export const materials: Record<string, string> = Object.assign(
    {},
    ...Object.values(MATERIAL_CATEGORIES),
);

export const EXPERIMENTAL_MATERIALS = new Set<string>(
    Object.keys(MATERIAL_CATEGORIES.Experimental),
);
export var COLS_PER_ROW = 38;
export var MAP_ROWS = 1502;
export var VIEW_COLS_PER_ROW = 36;
export var INITIAL_ROW = 290; //Start at row 290, near surface level
export var ROWS_ABOVE_SURFACE = 301;
export var INGAME_DEPTH_RATIO = 12.5;

//Images
export var images: { [key: string]: HTMLImageElement } = {};

//Instance export variables
export var keys = { control: false, shift: false };

export const SECRET_SKY_SHOP = {
    row: 1,
    startCol: 34,
    endCol: 36,
} as const;

export var OUTPOSTS = [
    new Outpost(
        "Alpha",
        [
            new Rectangle(new Point(444, 12), new Point(445, 25)),
            new Rectangle(new Point(446, 1), new Point(447, 36)),
        ],
        true,
    ),
    new Outpost(
        "Beta",
        [
            new Rectangle(new Point(644, 12), new Point(645, 25)),
            new Rectangle(new Point(646, 1), new Point(647, 36)),
        ],
        true,
    ),
    new Outpost("Gamma", [new Rectangle(new Point(762, 25), new Point(766, 32))], false),
    new Outpost(
        "Delta",
        [
            new Rectangle(new Point(894, 12), new Point(895, 25)),
            new Rectangle(new Point(896, 1), new Point(897, 36)),
        ],
        true,
    ),
    new Outpost("BossRoom", [new Rectangle(new Point(1492, 4), new Point(1497, 33))], false),
    new Outpost(
        "",
        [
            //This is the entire boss room, including the barriers, for safety
            new Rectangle(new Point(1490, 1), new Point(1500, 36)),
        ],
        false,
    ),
    new Outpost("", [new Rectangle(new Point(1501, 1), new Point(1501, 36))], false),
    new Outpost("Surface", [new Rectangle(new Point(292, 1), new Point(300, 36))], true),
];
