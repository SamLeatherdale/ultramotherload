//Load & Save functions
function LoadImages() {
    var image;
    var filename;
    for (var i = 0; i < image_filenames.length; i++) {
        filename = image_filenames[i];
        image = new Image();
        image.onload = (function(filename){
            return function() {
                LoadImageComplete(filename);
            };
        })(filename);
        image.src = "res/" + filename;
        images[filename.split(".")[0]] = image;
    }
}

function LoadImageComplete(filename) {
    images_loaded += 1;
    if (images_loaded == image_filenames.length) {
        console.log("Image load complete");
        Setup();
    }
}

function LoadFile() {
    console.log(this.files);

    var reader = new FileReader();
    reader.onloadend = function(e) {
        if (e.target.readyState == FileReader.DONE) { // DONE == 2
            ParseFile(e.target.result);
        }
    };

    var file = this.files[0];
    $("#map_filename").text(file.name);
    reader.readAsArrayBuffer(file);
}

function SaveFile() {
    var data = [];
    var file;
    var cell;
    for (var row = 0; row < map.length; row++) {
        for (var col = 0; col < COLS_PER_ROW; col++) {
            cell = map[row][col];
            data.push(cell.encode(cell.code));
            data.push(cell.encode(cell.color));
        }
    }
    data = new Uint8Array(data);
    var datastream = new DataStream();
    datastream.writeUint8Array(file_header); //Reattach the header
    datastream.writeUint8Array(data); //And add the body

    //Save the file
    if (URL && URL.createObjectURL) {
        if ($("#output_map").attr('href') != "") {
            URL.revokeObjectURL($("#output_map").attr('href'));
        }
        var blob = new Blob([datastream.buffer]);
        var url = URL.createObjectURL(blob);
        $("#output_map").attr('href', url);
        $("#output_map")[0].click(); //Trigger underlying
    } else {
        alert("Can't create object URL.");
    }
}

function LoadDefaultMap() {
    /* Loading arrayBuffers using AJAX is not supported by jQuery, use native XMLHttpRequest instead:
     * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data
     */
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "sample_map", true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
        if (this.readyState == 4 && this.status == 200) {
            var arrayBuffer = oReq.response; // Note: not oReq.responseText
            if (arrayBuffer) {
                ParseFile(arrayBuffer);
            }
        }
    };

    oReq.send();
}

function ParseFile(file) {
    datastream = new DataStream(file, 0);
    file_header = datastream.mapUint8Array(48); //First 48 bytes are the header
    var rawmap = datastream.mapUint8Array(file.byteLength - 48); //Now read the rest of the file

    //Check this is a valid file
    var verification = "";
    for (var i = 1; i < 6; i++) {
        verification += String.fromCharCode(file_header[i]);
    }
    if (verification != "XGSML") {
        console.error("This is not a valid Super Motherload Map file");
        return;
    }

    //Create the map
    map = [];
    var cells = [];
    var row = 0;
    var col = 0;
    var val;
    for (var i = 0; i <= rawmap.length - 2; i += 2) { //Go in blocks of two 8 bit numbers
        cells.push(new Cell(rawmap[i], rawmap[i + 1], row, col));
        col++;
        if (col == COLS_PER_ROW) {
            col = 0;
            row++;
            map.push(cells);
            cells = [];
        }
    }

    //Initialize some stuff
    TOTAL_ROWS = map.length;
    MAX_VIEW_ROWS = TOTAL_ROWS - ROWS_PER_VIEW;
    current_row = INITIAL_ROW;
    $("#input_current_row").attr("max", MAX_VIEW_ROWS).val(INITIAL_ROW);
    $("#input_current_depth").attr({min: -(MAX_VIEW_ROWS - ROWS_ABOVE_SURFACE) * INGAME_DEPTH_RATIO,
        max: ROWS_ABOVE_SURFACE * INGAME_DEPTH_RATIO
    });
    CreateScrollbar();
    UpdateCurrentRow(INITIAL_ROW);

    draw_allowed = true;
    ZoomUpdate();
    map[ROWS_ABOVE_SURFACE][1].click(); //Click the first ground cell, so we can start keyboard navigation


    //Set up event handlers for post-load events
    $("#load_splash").hide();
    $("#map").css({display: "inline-block"}); //Show the canvas

    $("#map_scrollbar, #map").mousewheel(ScrollbarOnScroll);
    $("#map_scrollcontrols button").click(ScrollButtonOnClick);
    $("#map").click(CanvasClick);
    $("#input_current_row").change(function() {
        UpdateCurrentRow(parseInt($(this).val()));
    });
    $("#input_current_depth").change(function() {
        var row = -(Math.round(parseFloat($(this).val()) / INGAME_DEPTH_RATIO)) + ROWS_ABOVE_SURFACE;
        UpdateCurrentRow(row);
    });
}
