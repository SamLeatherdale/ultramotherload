import { Cell } from "./cell";
import { tileManifest } from "./images";

const BIT_N = 1;
const BIT_NE = 2;
const BIT_E = 4;
const BIT_SE = 8;
const BIT_S = 16;
const BIT_SW = 32;
const BIT_W = 64;
const BIT_NW = 128;

// Canonical 8-neighbor solid bitmask -> Super Motherload regular tunnel sprite ID (001 or 257..302)
export const TUNNEL_MASK_TO_ID: Record<number, number> = {
    0: 1,
    1: 265,
    2: 300,
    4: 290,
    5: 275,
    8: 301,
    9: 284,
    10: 268,
    16: 291,
    17: 258,
    18: 289,
    20: 276,
    21: 257,
    32: 302,
    33: 287,
    34: 269,
    36: 285,
    37: 278,
    40: 296,
    41: 262,
    42: 293,
    64: 292,
    65: 260,
    66: 263,
    68: 274,
    69: 273,
    72: 264,
    73: 261,
    74: 283,
    80: 277,
    81: 272,
    82: 280,
    84: 271,
    85: 259,
    128: 270,
    130: 298,
    132: 288,
    136: 299,
    138: 267,
    144: 286,
    146: 282,
    148: 279,
    160: 297,
    162: 295,
    164: 281,
    168: 294,
    170: 266,
};

// Canonical E/SE/S/SW/W solid bitmask -> Super Motherload top-edge tunnel sprite ID (384..396)
export const TOP_TUNNEL_MASK_TO_ID: Record<number, number> = {
    0: 384,
    4: 394,
    8: 396,
    16: 391,
    20: 392,
    32: 390,
    36: 386,
    40: 389,
    64: 395,
    68: 387,
    72: 393,
    80: 385,
    84: 388,
};

const OPEN_TILE_CODES = new Set(["01", "02", "FF", "FE"]);

export function isSolidForTunnel(map: Cell[][], row: number, col: number): boolean {
    if (row < 0 || row >= map.length || col < 0 || col >= map[row].length) {
        return true;
    }
    return !OPEN_TILE_CODES.has(map[row][col].code);
}

export function getTunnelSpriteKey(
    map: Cell[][],
    row: number,
    col: number,
    colorHex: string,
): string {
    const n = isSolidForTunnel(map, row - 1, col);
    const e = isSolidForTunnel(map, row, col + 1);
    const s = isSolidForTunnel(map, row + 1, col);
    const w = isSolidForTunnel(map, row, col - 1);

    let canon = 0;
    if (n) canon |= BIT_N;
    if (e) canon |= BIT_E;
    if (s) canon |= BIT_S;
    if (w) canon |= BIT_W;

    // Corner dirt lips only appear when both adjacent cardinal neighbors are open
    if (!n && !e && isSolidForTunnel(map, row - 1, col + 1)) canon |= BIT_NE;
    if (!e && !s && isSolidForTunnel(map, row + 1, col + 1)) canon |= BIT_SE;
    if (!s && !w && isSolidForTunnel(map, row + 1, col - 1)) canon |= BIT_SW;
    if (!w && !n && isSolidForTunnel(map, row - 1, col - 1)) canon |= BIT_NW;

    const id = TUNNEL_MASK_TO_ID[canon] ?? 1;
    const biome = parseInt(colorHex, 16) & 3;
    return `T${String(id).padStart(3, "0")}_${biome}`;
}

export function getTopTunnelSpriteKey(
    map: Cell[][],
    row: number,
    col: number,
    colorHex: string,
): string {
    const e = isSolidForTunnel(map, row, col + 1);
    const s = isSolidForTunnel(map, row + 1, col);
    const w = isSolidForTunnel(map, row, col - 1);

    let canon = 0;
    if (e) canon |= BIT_E;
    if (s) canon |= BIT_S;
    if (w) canon |= BIT_W;
    if (!e && !s && isSolidForTunnel(map, row + 1, col + 1)) canon |= BIT_SE;
    if (!s && !w && isSolidForTunnel(map, row + 1, col - 1)) canon |= BIT_SW;

    const id = TOP_TUNNEL_MASK_TO_ID[canon] ?? 384;
    const biome = parseInt(colorHex, 16) & 3;
    return `E${id}_${biome}`;
}

export function getCellSpriteKey(map: Cell[][], cell: Cell): string {
    if (cell.code === "01") {
        return getTunnelSpriteKey(map, cell.row, cell.col, cell.color);
    }
    if (cell.code === "02") {
        return getTopTunnelSpriteKey(map, cell.row, cell.col, cell.color);
    }
    // Biome-independent codes (FD, FE, FF) are keyed directly by 2-digit code;
    // biome-dependent tiles use the 4-digit hexcode (code + color).
    return cell.code in tileManifest.tiles ? cell.code : cell.hexcode;
}

export function getMaterialIconKey(code: string): string {
    // 01, 02, FD, FE, FF exist directly in the manifest; all other materials default to biome 00.
    return code in tileManifest.tiles ? code : `${code}00`;
}

export interface SpriteRect {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    col: number;
    row: number;
}

function deterministicHash(row: number, col: number): number {
    return ((row * 73856093) ^ (col * 19349663)) >>> 0;
}

export function getTileSpriteRect(key: string, row: number, col: number): SpriteRect {
    const frames = tileManifest.tiles[key] ?? tileManifest.tiles.FD;
    const index =
        frames.length === 1 ? frames[0] : frames[deterministicHash(row, col) % frames.length];
    const sheetCol = index % tileManifest.cols;
    const sheetRow = Math.floor(index / tileManifest.cols);
    return {
        sx: sheetCol * tileManifest.tileSize,
        sy: sheetRow * tileManifest.tileSize,
        sw: tileManifest.tileSize,
        sh: tileManifest.tileSize,
        col: sheetCol,
        row: sheetRow,
    };
}
