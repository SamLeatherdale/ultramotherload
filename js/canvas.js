//Canvas functions
function Redraw() {
    if (!draw_allowed) {
        return;
    }
    var zoom_img_size = IMG_SIZE * zoom_level;
    var viewable_selected_cells = [];
    ctx.clearRect(0, 0, $("#map").width, $("#map").height);

    //Draw special features (if applicable)
    $.each(outposts, function(i, outpost) {
        if (outpost.name == "") {
            return true; //Continue loop
        }
        if (current_row > outpost.start_row - ROWS_PER_VIEW && current_row <= outpost.end_row) {
            //Draw outpost
            var x = (outpost.start_col - 1) * zoom_img_size; //-1 to account for marker columns
            var y = (outpost.start_row - current_row) * zoom_img_size;
            ctx.drawImage(images[outpost.name], x, y, outpost.width * zoom_img_size, outpost.height * zoom_img_size);
        }
    });

    //Draw cells
    var cell;
    for (var row = 0; row < ROWS_PER_VIEW; row++) {
        for (var col = 0; col < VIEW_COLS_PER_ROW; col++) {
            cell = map[row + current_row][col + 1]; //Exclude marker columns
            var x = col * zoom_img_size;
            var y = row * zoom_img_size;
            if (cell.draw || cell.modified) { //Always draw overwritten cells
                try {
                    ctx.drawImage(images[getImage(cell.code, cell.hexcode)], x, y, zoom_img_size, zoom_img_size);
                } catch (err) {
                    console.error("Failed to draw " + cell.hexcode);
                }
            }
            if (cell.isSelected() || cell.isPasting()) {
                viewable_selected_cells.push({
                    cell: cell,
                    x: x,
                    y: y
                });
            }
        }
    }

    //Draw cell outlines last
    $.each(viewable_selected_cells, function(i, outline) {
        ctx.strokeStyle = selected_color;
        if (outline.cell.id == last_selected.id) {
            ctx.strokeStyle = last_selected_color;
        } else if (outline.cell.isPasting()) {
            ctx.strokeStyle = paste_color;
        }
        ctx.lineWidth = 2;
        ctx.strokeRect(outline.x + 0.5, outline.y + 0.5, zoom_img_size - 1, zoom_img_size - 1);
    });
}

function UpdateCanvasSize() {
    var canvas = $("#map")[0];
    var max_height = $(window).height() - $("#header").outerHeight(true) - $("#footer").outerHeight(true) - 20;
    ROWS_PER_VIEW = Math.floor(max_height / (IMG_SIZE * zoom_level));
    var newwidth = VIEW_COLS_PER_ROW * IMG_SIZE * zoom_level;
    var newheight = ROWS_PER_VIEW * IMG_SIZE * zoom_level;

    canvas.width = newwidth;
    canvas.height = newheight;
    $("#map_controls").css({height: newheight});
    ctx = canvas.getContext('2d');
    Redraw();
}

function CanvasClick(e) {
    var targetRow = current_row + Math.floor(e.offsetY / (IMG_SIZE * zoom_level));
    var targetCol = Math.floor(e.offsetX / (IMG_SIZE * zoom_level)) + 1; //Add one to account for marker
    var target = map[targetRow][targetCol];
    target.click();
}

function ZoomUpdate() {
    zoom_level = parseFloat($("#map_zoom").val());
    UpdateCanvasSize();
    Redraw();
}
