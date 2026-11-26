//Canvas functions
import $ from "jquery";
import { getCellSpriteKey, getTileSpriteRect } from "./autotile";
import { replaceSelectionWithRectangle } from "./cell";
import * as globals from "./globals";
import { state } from "./globals";
import { findCorners } from "./helper";
import { TILE_SHEET_KEY } from "./images";
import { draw_allowed } from "./io";
import { CreateScrollbar, UpdateCurrentRow } from "./ui";

let ctx: CanvasRenderingContext2D;
const SELECT_FILL = "rgba(0, 120, 215, 0.28)";
const SELECT_STROKE = "#0078d7";
const PASTE_FILL = "rgba(122, 63, 242, 0.28)";
const PASTE_STROKE = "#7a3ff2";
const MARQUEE_FILL = "rgba(0, 120, 215, 0.2)";
const MARQUEE_STROKE = "#0078d7";

type PaintedCell = {
    row: number;
    col: number;
    x: number;
    y: number;
    w: number;
    h: number;
};

let marquee: { startRow: number; startCol: number; endRow: number; endCol: number } | null = null;
let drag: {
    pointerId: number;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
} | null = null;
let redrawQueued = false;

let zoom_level = 1;

const IMG_SIZE = 30;

function snapToDevicePixel(value: number, dpr: number): number {
    return Math.round(value * dpr) / dpr;
}

export function Redraw() {
    if (!draw_allowed) {
        return;
    }
    const dpr = window.devicePixelRatio || 1;
    const zoom_img_size = IMG_SIZE * zoom_level;
    const tileSheet = globals.images[TILE_SHEET_KEY];
    const selectedPaint: PaintedCell[] = [];
    const pastePaint: PaintedCell[] = [];

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);

    //Draw seamless space & Mars atmosphere transition backdrop above Surface (rows 0..291)
    const SURFACE_TOP_ROW = 292;
    const TRANSITION_ROWS = 6;
    const TRANSITION_COLS = 6;
    const TRANSITION_TOP_ROW = SURFACE_TOP_ROW - TRANSITION_ROWS; // 286..291
    const SECTION_ROWS = 3;
    const SECTION_COLS = 12;

    const viewStartRow = state.current_row;
    const viewEndRow = state.current_row + state.rows_per_view;

    const spaceSection = globals.images.SpaceSection;
    if (spaceSection && viewStartRow < TRANSITION_TOP_ROW) {
        // Align 3-row sections upward from TRANSITION_TOP_ROW (286) so seams match cleanly
        const firstBlockEnd =
            TRANSITION_TOP_ROW -
            Math.floor(
                (TRANSITION_TOP_ROW - Math.min(viewEndRow, TRANSITION_TOP_ROW)) / SECTION_ROWS,
            ) *
                SECTION_ROWS;
        for (let blockEnd = firstBlockEnd; blockEnd > viewStartRow; blockEnd -= SECTION_ROWS) {
            const blockStart = blockEnd - SECTION_ROWS;
            const y0 = snapToDevicePixel((blockStart - state.current_row) * zoom_img_size, dpr);
            const y1 = snapToDevicePixel((blockEnd - state.current_row) * zoom_img_size, dpr);
            for (let col = 0; col < globals.VIEW_COLS_PER_ROW; col += SECTION_COLS) {
                const x0 = snapToDevicePixel(col * zoom_img_size, dpr);
                const x1 = snapToDevicePixel((col + SECTION_COLS) * zoom_img_size, dpr);
                ctx.drawImage(spaceSection, x0, y0, x1 - x0, y1 - y0);
            }
        }
    }

    const spaceTransition = globals.images.SpaceTransition;
    if (spaceTransition && viewEndRow > TRANSITION_TOP_ROW && viewStartRow < SURFACE_TOP_ROW) {
        const y0 = snapToDevicePixel((TRANSITION_TOP_ROW - state.current_row) * zoom_img_size, dpr);
        const y1 = snapToDevicePixel((SURFACE_TOP_ROW - state.current_row) * zoom_img_size, dpr);
        for (let col = 0; col < globals.VIEW_COLS_PER_ROW; col += TRANSITION_COLS) {
            const x0 = snapToDevicePixel(col * zoom_img_size, dpr);
            const x1 = snapToDevicePixel((col + TRANSITION_COLS) * zoom_img_size, dpr);
            ctx.drawImage(spaceTransition, x0, y0, x1 - x0, y1 - y0);
        }
    }

    //Draw special features (if applicable)
    $.each(globals.OUTPOSTS, function (i, outpost) {
        if (outpost.name == "") {
            return true; //Continue loop
        }
        if (
            state.current_row > outpost.start_row - state.rows_per_view &&
            state.current_row <= outpost.end_row
        ) {
            //Draw outpost
            const outpostImage = globals.images[outpost.name];
            if (!outpostImage) {
                return true;
            }
            const x0 = snapToDevicePixel((outpost.start_col - 1) * zoom_img_size, dpr); //-1 to account for marker columns
            const x1 = snapToDevicePixel(
                (outpost.start_col - 1 + outpost.width) * zoom_img_size,
                dpr,
            );
            const y0 = snapToDevicePixel(
                (outpost.start_row - state.current_row) * zoom_img_size,
                dpr,
            );
            const y1 = snapToDevicePixel(
                (outpost.start_row - state.current_row + outpost.height) * zoom_img_size,
                dpr,
            );
            ctx.drawImage(outpostImage, x0, y0, x1 - x0, y1 - y0);
        }
    });

    //Draw cells
    for (let row = 0; row < state.rows_per_view; row++) {
        const y0 = snapToDevicePixel(row * zoom_img_size, dpr);
        const y1 = snapToDevicePixel((row + 1) * zoom_img_size, dpr);
        const h = y1 - y0;
        for (let col = 0; col < globals.VIEW_COLS_PER_ROW; col++) {
            const cell = state.map[row + state.current_row][col + 1]; //Exclude marker columns
            const x0 = snapToDevicePixel(col * zoom_img_size, dpr);
            const x1 = snapToDevicePixel((col + 1) * zoom_img_size, dpr);
            const w = x1 - x0;
            if (cell.draw || cell.modified) {
                //Always draw overwritten cells; above the surface let the seamless space/surface backdrop show through FF
                if (cell.code === "FF") {
                    if (cell.row >= globals.ROWS_ABOVE_SURFACE) {
                        ctx.fillStyle = "#1a171c";
                        ctx.fillRect(x0, y0, w, h);
                    }
                } else {
                    const spriteKey = getCellSpriteKey(state.map, cell);
                    const rect = getTileSpriteRect(spriteKey, cell.row, cell.col);
                    ctx.drawImage(tileSheet, rect.sx, rect.sy, rect.sw, rect.sh, x0, y0, w, h);
                }
            }
            if (cell.isPasting()) {
                pastePaint.push({ row: cell.row, col: cell.col, x: x0, y: y0, w, h });
            } else if (cell.isSelected()) {
                selectedPaint.push({ row: cell.row, col: cell.col, x: x0, y: y0, w, h });
            }
        }
    }

    //Draw secret sky shop trigger indicator (row 1, cols 34..36) when in view
    const shopViewRow = globals.SECRET_SKY_SHOP.row - state.current_row;
    if (shopViewRow >= 0 && shopViewRow < state.rows_per_view) {
        const sx0 = snapToDevicePixel((globals.SECRET_SKY_SHOP.startCol - 1) * zoom_img_size, dpr);
        const sx1 = snapToDevicePixel(globals.SECRET_SKY_SHOP.endCol * zoom_img_size, dpr);
        const sy0 = snapToDevicePixel(shopViewRow * zoom_img_size, dpr);
        const sy1 = snapToDevicePixel((shopViewRow + 1) * zoom_img_size, dpr);
        ctx.save();
        ctx.fillStyle = "rgba(63, 255, 173, 0.16)";
        ctx.fillRect(sx0, sy0, sx1 - sx0, sy1 - sy0);
        ctx.strokeStyle = "#3fffad";
        ctx.lineWidth = Math.max(1, Math.round(1.5 * dpr)) / dpr;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(sx0 + 1, sy0 + 1, sx1 - sx0 - 2, sy1 - sy0 - 2);
        ctx.setLineDash([]);
        ctx.fillStyle = "#3fffad";
        ctx.font = `bold ${Math.max(8, Math.round(zoom_img_size * 0.36))}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SKY SHOP", (sx0 + sx1) / 2, (sy0 + sy1) / 2);
        ctx.restore();
    }

    drawRegion(
        selectedPaint,
        (row, col) => !!state.map[row]?.[col]?.isSelected(),
        SELECT_FILL,
        SELECT_STROKE,
    );
    drawRegion(
        pastePaint,
        (row, col) => !!state.map[row]?.[col]?.isPasting(),
        PASTE_FILL,
        PASTE_STROKE,
    );
    if (state.current_action === "action_copy") {
        drawRegionBadge("Copy", state.selected_cells, SELECT_STROKE);
        drawRegionBadge("Paste", state.paste_cells, PASTE_STROKE);
    }
    if (marquee) {
        drawMarquee(marquee.startRow, marquee.startCol, marquee.endRow, marquee.endCol, dpr);
    }
}

function drawRegion(
    cells: PaintedCell[],
    member: (row: number, col: number) => boolean,
    fill: string,
    stroke: string,
) {
    if (cells.length === 0) {
        return;
    }
    ctx.fillStyle = fill;
    for (const cell of cells) {
        ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
    }
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.lineCap = "square";
    ctx.beginPath();
    for (const cell of cells) {
        const { row, col, x, y, w, h } = cell;
        if (!member(row - 1, col)) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + w, y);
        }
        if (!member(row + 1, col)) {
            ctx.moveTo(x, y + h);
            ctx.lineTo(x + w, y + h);
        }
        if (!member(row, col - 1)) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + h);
        }
        if (!member(row, col + 1)) {
            ctx.moveTo(x + w, y);
            ctx.lineTo(x + w, y + h);
        }
    }
    ctx.stroke();
    ctx.restore();
}

function drawRegionBadge(
    text: string,
    cells: { [key: number]: { row: number; col: number } },
    accent: string,
) {
    const list = Object.values(cells);
    if (list.length === 0) {
        return;
    }
    const corners = findCorners(list);
    const inView =
        corners.endRow >= state.current_row &&
        corners.startRow < state.current_row + state.rows_per_view;
    if (!inView) {
        return;
    }
    const zoom = IMG_SIZE * zoom_level;
    const dpr = window.devicePixelRatio || 1;
    const x = snapToDevicePixel((corners.startCol - 1) * zoom, dpr);
    const y = snapToDevicePixel((corners.startRow - state.current_row) * zoom, dpr);
    const viewWidth = ctx.canvas.width / dpr;
    const viewHeight = ctx.canvas.height / dpr;

    ctx.save();
    ctx.font = "600 11px Segoe UI, sans-serif";
    const padX = 6;
    const height = 16;
    const width = Math.ceil(ctx.measureText(text).width) + padX * 2 + 3;
    let badgeX = x;
    let badgeY = y - height - 3;
    if (badgeY < 2) {
        badgeY = Math.min(Math.max(2, y + 3), viewHeight - height - 2);
    }
    badgeX = Math.min(Math.max(2, badgeX), Math.max(2, viewWidth - width - 2));
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, width, height, 3);
    ctx.fillStyle = "rgba(20, 20, 20, 0.9)";
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(badgeX, badgeY, 3, height);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, badgeX + padX + 1, badgeY + height / 2);
    ctx.restore();
}

function drawMarquee(rowA: number, colA: number, rowB: number, colB: number, dpr: number) {
    const zoom = IMG_SIZE * zoom_level;
    const startRow = Math.min(rowA, rowB);
    const endRow = Math.max(rowA, rowB);
    const startCol = Math.min(colA, colB);
    const endCol = Math.max(colA, colB);
    const x = snapToDevicePixel((startCol - 1) * zoom, dpr);
    const y = snapToDevicePixel((startRow - state.current_row) * zoom, dpr);
    const w = snapToDevicePixel((endCol - startCol + 1) * zoom, dpr);
    const h = snapToDevicePixel((endRow - startRow + 1) * zoom, dpr);
    ctx.save();
    ctx.fillStyle = MARQUEE_FILL;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = MARQUEE_STROKE;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1));
    ctx.restore();
}

export function UpdateCanvasSize() {
    const canvas = $("#map")[0] as HTMLCanvasElement;
    const dpr = window.devicePixelRatio || 1;
    const windowHeight = $(window).height() as number;
    const headerHeight = $("#header").outerHeight(true) as number;
    const footerHeight = $("#footer").outerHeight(true) as number;
    const max_height = windowHeight - headerHeight - footerHeight - 20;
    state.rows_per_view = Math.max(1, Math.floor(max_height / (IMG_SIZE * zoom_level)));
    state.max_view_rows = state.total_rows - state.rows_per_view;
    if (state.current_row + state.rows_per_view > state.total_rows) {
        state.current_row = state.total_rows - state.rows_per_view;
    }
    const newWidth = Math.round(globals.VIEW_COLS_PER_ROW * IMG_SIZE * zoom_level);
    const newHeight = Math.round(state.rows_per_view * IMG_SIZE * zoom_level);

    canvas.width = Math.round(newWidth * dpr);
    canvas.height = Math.round(newHeight * dpr);
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    $("#map_scrollcontrols").css({ height: newHeight });
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    CreateScrollbar();
    UpdateCurrentRow(state.current_row);
}

function cellAt(offsetX: number, offsetY: number) {
    if (!state.map.length || state.rows_per_view < 1) {
        return null;
    }
    const size = IMG_SIZE * zoom_level;
    const viewRow = Math.min(state.rows_per_view - 1, Math.max(0, Math.floor(offsetY / size)));
    const viewCol = Math.min(
        globals.VIEW_COLS_PER_ROW - 1,
        Math.max(0, Math.floor(offsetX / size)),
    );
    return state.map[state.current_row + viewRow]?.[viewCol + 1] ?? null;
}

function requestRedraw() {
    if (redrawQueued) {
        return;
    }
    redrawQueued = true;
    requestAnimationFrame(() => {
        redrawQueued = false;
        Redraw();
    });
}

let pointerBound = false;

export function BindMapPointer() {
    if (pointerBound) {
        return;
    }
    const canvas = document.getElementById("map");
    if (!canvas) {
        return;
    }
    pointerBound = true;
    canvas.addEventListener("pointerdown", onMapPointerDown);
    canvas.addEventListener("pointermove", onMapPointerMove);
    canvas.addEventListener("pointerup", onMapPointerUp);
    canvas.addEventListener("pointercancel", onMapPointerCancel);
}

function onMapPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLCanvasElement)) {
        return;
    }
    const cell = cellAt(event.offsetX, event.offsetY);
    if (!cell) {
        return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag = {
        pointerId: event.pointerId,
        startRow: cell.row,
        startCol: cell.col,
        endRow: cell.row,
        endCol: cell.col,
    };
    marquee = null;
    event.preventDefault();
}

function onMapPointerMove(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId || state.current_action === "action_copy") {
        return;
    }
    const cell = cellAt(event.offsetX, event.offsetY);
    if (!cell || (cell.row === drag.endRow && cell.col === drag.endCol)) {
        return;
    }
    drag.endRow = cell.row;
    drag.endCol = cell.col;
    marquee =
        cell.row !== drag.startRow || cell.col !== drag.startCol
            ? {
                  startRow: drag.startRow,
                  startCol: drag.startCol,
                  endRow: cell.row,
                  endCol: cell.col,
              }
            : null;
    requestRedraw();
}

function onMapPointerUp(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
        return;
    }
    const finished = drag;
    drag = null;
    marquee = null;
    if (state.current_action === "action_copy") {
        const cell = cellAt(event.offsetX, event.offsetY);
        (cell ?? state.map[finished.startRow]?.[finished.startCol])?.click();
        return;
    }
    const spansCells =
        finished.endRow !== finished.startRow || finished.endCol !== finished.startCol;
    if (spansCells) {
        replaceSelectionWithRectangle(
            finished.startRow,
            finished.startCol,
            finished.endRow,
            finished.endCol,
        );
        return;
    }
    const gesture = globals.keys.control ? "toggle" : "replace";
    state.map[finished.startRow]?.[finished.startCol]?.click(gesture);
}

function onMapPointerCancel(event: PointerEvent) {
    if (!drag || event.pointerId !== drag.pointerId) {
        return;
    }
    drag = null;
    marquee = null;
    requestRedraw();
}

export function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val() as string);
    UpdateCanvasSize();
    Redraw();
}
