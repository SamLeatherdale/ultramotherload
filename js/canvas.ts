//Canvas functions
import $ from "jquery";
import { getCellSpriteKey, getTileSpriteRect } from "./autotile";
import * as globals from "./globals";
import { state } from "./globals";
import { TILE_SHEET_KEY } from "./images";
import { draw_allowed } from "./io";
import { CreateScrollbar, UpdateCurrentRow } from "./ui";
import ClickEvent = JQuery.ClickEvent;

let ctx: CanvasRenderingContext2D;
//Draw colours
const selected_color = "#00fffa";
const last_selected_color = "#0072ff";
const paste_color = "#9800ff";

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
    const viewable_selected_cells = [];

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
            if (cell.isSelected() || cell.isPasting()) {
                viewable_selected_cells.push({
                    cell,
                    x: x0,
                    y: y0,
                    w,
                    h,
                });
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

    //Draw cell outlines last
    $.each(viewable_selected_cells, function (i, outline) {
        ctx.strokeStyle = selected_color;
        if (outline.cell.id == state.last_selected?.id) {
            ctx.strokeStyle = last_selected_color;
        } else if (outline.cell.isPasting()) {
            ctx.strokeStyle = paste_color;
        }
        ctx.lineWidth = Math.max(1, Math.round(2 * dpr)) / dpr;
        const inset = ctx.lineWidth / 2;
        ctx.strokeRect(
            outline.x + inset,
            outline.y + inset,
            outline.w - ctx.lineWidth,
            outline.h - ctx.lineWidth,
        );
    });
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

export function CanvasClick(e: ClickEvent) {
    const targetRow = state.current_row + Math.floor(e.offsetY / (IMG_SIZE * zoom_level));
    const targetCol = Math.floor(e.offsetX / (IMG_SIZE * zoom_level)) + 1; //Add one to account for marker
    const target = state.map[targetRow][targetCol];
    target.click();
}

export function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val() as string);
    UpdateCanvasSize();
    Redraw();
}
