<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Ultra Motherload - Super Motherload Map Editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css" integrity="sha384-/Y6pD6FV/Vv2HJnA6t+vslU6fwYXjCFtcEpHbNJ0lyAFsXTsjBbfaDjzALeQsN6M" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" integrity="sha256-eZrrJcwDc/3uDhsdt61sL2oOBY362qM3lon1gyExkL0=" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.css" integrity="sha256-rByPlHULObEjJ6XQxW/flG2r+22R5dKiAoef+aXWfik=" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.structure.min.css" integrity="sha256-rxais37anKUnpL5QzSYte+JnIsmkGmLG+ZhKSkZkwVM=" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.theme.min.css" integrity="sha256-AjyoyaRtnGVTywKH/Isxxu5PXI0s4CcE0BzPAX83Ppc=" crossorigin="anonymous" />
    <link rel="stylesheet" href="css/style.css?v=<?=microtime()?>">
    
    <!--JavaScript -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js" integrity="sha256-KM512VNnjElC30ehFwehXjx1YCHPiQkOPmqnrWtpccM=" crossorigin="anonymous"></script>

    <!--Bootstrap-->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.11.0/umd/popper.min.js" integrity="sha384-b/U6ypiBEHpOf/4+1nzFpr53nxSS+GLCkfwBdFNTxtclqqenISfwAzpKaMNFNmj4" crossorigin="anonymous"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/js/bootstrap.min.js" integrity="sha384-h0AbiXch4ZDo7tp9hKZ4TsHbi047NrKGLO3SEJAg45jXxnGIfYzk4Si90RDIqNm1" crossorigin="anonymous"></script>

    <script src="jquery.mousewheel.js"></script>
    <script src="DataStream.js"></script>
    <script src="ultra.js?v=<?=microtime()?>"></script>
</head>
<body>
    <h1>Ultra Motherload</h1>

    <form onsubmit="return false;">
        <div class="form-group">
            <label for="map_file">Select map file:</label>
            <input type="file" class="form-control-file" id="map_file">
        </div>

        <div class="form-group">
            <label for="map_file">Select zoom level:</label>
            <select id="map_zoom">
                <option value="0.75">75%</option>
                <option value="1" selected>100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="1.75">175%</option>
            </select>
        </div>

        <button id="save_map" onclick="SaveFile();">Save map</button>
        <a id="output_map" download="map">Download edited map</a>
    </form>

    <canvas width="1080" height="600" id="map"></canvas>

    <div id="map_controls">

        <div id="map_scrollcontrols">
            <button class="ui-button ui-widget ui-corner-all" id="map_upmany">
                <i class="fa fa-angle-double-up"></i>
            </button>
            <button class="ui-button ui-widget ui-corner-all" id="map_upone">
                <i class="fa fa-angle-up"></i>
            </button>
            <div id="map_scrollbar">
                <div class="ui-slider-handle"></div>
            </div>
            <button class="ui-button ui-widget ui-corner-all" id="map_downone">
                <i class="fa fa-angle-down"></i>
            </button>
            <button class="ui-button ui-widget ui-corner-all" id="map_downmany">
                <i class="fa fa-angle-double-down"></i>
            </button>
        </div>

        <div id="map_editcontrols">
            <div class="controls-section">
                <h4>Tools</h4>
            <?php
                $button_tools = [
                    "Select" => (object) [
                        "icon" => "fa-mouse-pointer",
                        "id" => "select"
                    ],
                    "Overwrite" => (object) [
                        "icon" => "fa-hand-pointer-o",
                        "id" => "overwrite"
                    ]
                ];
                foreach ($button_tools as $tool_label => $tool_info) {
            ?>
                <button class="ui-button ui-widget ui-corner-all button-tool" id="tool_<?=$tool_info->id?>">
                    <i class="fa <?=$tool_info->icon?>"></i><span><?=$tool_label?></span>
                </button>
            <?php
                } ?>
            </div>

            <div class="controls-section">
                <h4>Actions</h4>
            <?php
                $button_actions = [
                    "Replace Selected" => (object) [
                        "icon" => "fa-pencil",
                        "id" => "replace"
                    ],
                    "Copy Selected" => (object) [
                        "icon" => "fa-copy",
                        "id" => "copy"
                    ],
                    "Paste" => (object) [
                        "icon" => "fa-paste",
                        "id" => "paste"
                    ]
                ];
                foreach ($button_actions as $action_label => $action_info) {
            ?>
                <button class="ui-button ui-widget ui-corner-all button-action ui-state-disabled" id="action_<?=$action_info->id?>">
                    <i class="fa <?=$action_info->icon?>"></i><span><?=$action_label?></span>
                </button>
            <?php
                } ?>
            </div>

            <div id="cell_infobox" class="controls-section card">
                <div class="card-header">
                    <div>Last Selected Tile</div>
                </div>
                <div class="card-body">
                <?php
                    $cell_details = ["Row", "Column", "Hexcode", "Material", "Color", "Locked"];
                    foreach ($cell_details as $detail_label) {
                ?>
                    <div>
                        <span class="cell-info-title"><?=$detail_label?>: </span><span id="info_cell_<?=strtolower($detail_label)?>"></span>
                    </div>
                <?php
                    } ?>
                </div>
            </div>
            
            <div id="selection_infobox" class="controls-section card">
                <div class="card-header">
                    <div>Selection Info</div>
                </div>
                <div class="card-body">
                <?php
                    $selection_details = [
                        "Width" => "width", 
                        "Height" => "height", 
                        "Total Cells" => "total"
                    ];
                    foreach ($selection_details as $detail_label => $detail_class) {
                ?>
                    <div>
                        <span class="cell-info-title"><?=$detail_label?>: </span><span id="info_selection_<?=$detail_class?>">0</span>
                    </div>
                <?php
                    } ?>
                </div>
            </div>

            <div class="controls-section card" id="position_infobox">
                <div class="card-header">
                    <div>Position</div>
                </div>
                <div class="card-body">
                    <div class="input-row">
                        <label class="position-info-title" for="input_current_row">Row:</label>
                        <input type="number" class="form-control" name="input_current_row" id="input_current_row" min="0">
                    </div>
                    <div class="input-row">
                        <label class="position-info-title">Depth: </label>
                        <div class="input-group-wrap">
                            <div class="input-group" id="input_group_depth">
                                <input type="number" class="form-control" id="input_current_depth" step="12.5" />
                                <span class="input-group-addon" id="basic-addon1">ft</span>
                            </div>
                        </div>
                    </div>
                </div>                
            </div>
            
            <div id="map_materials">
                <h4>Current Material:</h4>
                <a tabindex="10" id="current_material_container" class="inherit-link"></a>

                <div id="map_materials_panel" class="clearfix">
                    <div class="card-header">Select a material</div>
                    <div id="map_materials_container" class="clearfix">
                        <div class="material-container ui-button clearfix" data-code="">
                            <div class="material-icon"></div>
                            <div class="material-title"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>



    </div>
</body>
</html>