//Canvas functions
import * as globals from "./globals";
import { state } from "./globals";
import { draw_allowed } from "./io";
import { getImage } from "./helper";

let ctx: CanvasRenderingContext2D;
//Draw colours
const selected_color = "#00fffa";
const last_selected_color = "#0072ff";
const paste_color = "#9800ff";

let zoom_level = 1;

const IMG_SIZE = 30;

export function Redraw() {
    if (!draw_allowed) {
        return;
    }
    var zoom_img_size = IMG_SIZE * zoom_level;
    var viewable_selected_cells = [];
    ctx.clearRect(0, 0, $("#map").width, $("#map").height);

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
            var x = (outpost.start_col - 1) * zoom_img_size; //-1 to account for marker columns
            var y = (outpost.start_row - state.current_row) * zoom_img_size;
            ctx.drawImage(
                globals.images[outpost.name],
                x,
                y,
                outpost.width * zoom_img_size,
                outpost.height * zoom_img_size,
            );
        }
    });

    //Draw cells
    var cell;
    for (var row = 0; row < state.rows_per_view; row++) {
        for (var col = 0; col < globals.VIEW_COLS_PER_ROW; col++) {
            cell = state.map[row + state.current_row][col + 1]; //Exclude marker columns
            var x = col * zoom_img_size;
            var y = row * zoom_img_size;
            if (cell.draw || cell.modified) {
                //Always draw overwritten cells
                try {
                    ctx.drawImage(
                        globals.images[getImage(cell.code, cell.hexcode)],
                        x,
                        y,
                        zoom_img_size,
                        zoom_img_size,
                    );
                } catch (err) {
                    console.error("Failed to draw " + cell.hexcode);
                }
            }
            if (cell.isSelected() || cell.isPasting()) {
                viewable_selected_cells.push({
                    cell: cell,
                    x: x,
                    y: y,
                });
            }
        }
    }

    //Draw cell outlines last
    $.each(viewable_selected_cells, function (i, outline) {
        ctx.strokeStyle = selected_color;
        if (outline.cell.id == state.last_selected.id) {
            ctx.strokeStyle = last_selected_color;
        } else if (outline.cell.isPasting()) {
            ctx.strokeStyle = paste_color;
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(
            outline.x + 0.5,
            outline.y + 0.5,
            zoom_img_size - 1,
            zoom_img_size - 1,
        );
    });
}

export function UpdateCanvasSize() {
    var canvas = $("#map")[0] as HTMLCanvasElement;
    var max_height =
        $(window).height() -
        $("#header").outerHeight(true) -
        $("#footer").outerHeight(true) -
        20;
    state.rows_per_view = Math.floor(max_height / (IMG_SIZE * zoom_level));
    var newwidth = globals.VIEW_COLS_PER_ROW * IMG_SIZE * zoom_level;
    var newheight = state.rows_per_view * IMG_SIZE * zoom_level;

    canvas.width = newwidth;
    canvas.height = newheight;
    $("#map_scrollcontrols").css({ height: newheight });
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    Redraw();
}

export function CanvasClick(e: MouseEvent) {
    var targetRow =
        state.current_row + Math.floor(e.offsetY / (IMG_SIZE * zoom_level));
    var targetCol = Math.floor(e.offsetX / (IMG_SIZE * zoom_level)) + 1; //Add one to account for marker
    var target = state.map[targetRow][targetCol];
    target.click();
}

export function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val() as string);
    UpdateCanvasSize();
    Redraw();
}
