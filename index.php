<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <?php
    if (!empty($compile)) {
        $date = new DateTime(); ?>
        <!--Compiled on <?=$date->format("d/m/Y h:i:sA P T")?>-->
    <?php } ?>
    <title>Ultra Motherload - Super Motherload Map Editor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css" integrity="sha384-/Y6pD6FV/Vv2HJnA6t+vslU6fwYXjCFtcEpHbNJ0lyAFsXTsjBbfaDjzALeQsN6M" crossorigin="anonymous">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" integrity="sha256-eZrrJcwDc/3uDhsdt61sL2oOBY362qM3lon1gyExkL0=" crossorigin="anonymous" />
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css" />
    <link rel="stylesheet" href="css/bootstrap-switch.min.css" />
    <link rel="stylesheet" href="css/style.css?v=<?=microtime()?>" />



    <!--JavaScript -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js" integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js"></script>

    <!--Bootstrap-->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.11.0/umd/popper.min.js" integrity="sha384-b/U6ypiBEHpOf/4+1nzFpr53nxSS+GLCkfwBdFNTxtclqqenISfwAzpKaMNFNmj4" crossorigin="anonymous"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/js/bootstrap.min.js" integrity="sha384-h0AbiXch4ZDo7tp9hKZ4TsHbi047NrKGLO3SEJAg45jXxnGIfYzk4Si90RDIqNm1" crossorigin="anonymous"></script>

    <!--Bootstrap Toggle-->
    <link href="https://gitcdn.github.io/bootstrap-toggle/2.2.2/css/bootstrap-toggle.min.css" rel="stylesheet">
    <script src="js/lib/bootstrap-switch.min.js"></script>

    <script src="js/lib/jquery.mousewheel.js"></script>
    <script src="js/lib/DataStream.js"></script>
    <script src="ultra.js?v=<?=microtime()?>"></script>
</head>
<body>
<div id="content_wrap">
    <header id="header">
        <div id="title_row">
            <svg version="1.1" id="header_logo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
    	 width="62.063px" height="44.372px" viewBox="0 0 62.063 44.372" enable-background="new 0 0 62.063 44.372" xml:space="preserve" fill="#3FFFAD" stroke="#00C984">
            <polygon id="Section_4" stroke-miterlimit="10" points="0.925,0.5 61.092,0.5 49.635,16.558
            	7.646,10.767 "/>
            <polygon id="Section_3" stroke-miterlimit="10" points="10.439,14.054 48.258,18.834 43.722,25.5
            	15.183,21.521 "/>
            <polygon id="Section_2" stroke-miterlimit="10" points="17.592,24.667 41.758,28 38.258,33.5
            	22.39,31.806 "/>
            <polygon id="Section_1" stroke-miterlimit="10" points="25.093,35.099 35.758,36.667 31.008,43.5
            	"/>
            </svg>
            <h1 id="title">Ultra Motherload</h1>
        </div>
        <div id="input_file_row">
            <div class="form-group">
                <!-- <label for="map_file">Load map file:</label>
                <input type="file" class="btn btn-secondary" id="map_file"> -->
                <label class="custom-file">
                    <input type="file" id="map_file" style="display: none;">
                    <div class="input-group">
                        <span class="btn btn-primary input-group-addon">Load map...</span>
                        <span class="form-control" id="map_filename"></span>
                    </div>
                </label>

                <button id="save_map" class="btn btn-success" onclick="SaveFile();">Save map</button>
                <a id="output_map" download="map" href="">Download edited map</a>
            </div>
        </div>

        <div id="map_editcontrols">
            <div class="controls-section">
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
                <?php
                  $button_actions = [
                      "Replace" => (object) [
                          "icon" => "fa-pencil",
                          "id" => "replace"
                      ],
                      "Clear" => (object) [
                          "icon" => "fa-trash",
                          "id" => "clear"
                      ],
                      "Copy" => (object) [
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

            <div class="controls-section">
                <label for="map_zoom"><i class="fa fa-search"></i></label>
                <select id="map_zoom">
                    <option value="0.75">75%</option>
                    <option value="0.85">85%</option>
                    <option value="1" selected>100%</option>
                    <option value="1.25">125%</option>
                    <option value="1.5">150%</option>
                </select>
            </div>

            <div class="controls-section">
                <button class="ui-button ui-widget ui-corner-all" data-toggle="modal" data-target="#help_modal" id="button_help">
                    <i class="fa fa-question-circle"></i><span>Help</span>
                </button>
            </div>
        </div>
    </header>

    <main>
        <div id="load_splash">
            <div id="load_splash_container">
                <div id="load_splash_content">
                    <i id="load_splash_icon" class="fa fa-refresh fa-spin fa-3x fa-fw"></i>
                    <i id="load_splash_warning" class="fa fa-3x fa-exclamation-triangle"></i>
                    <h1 id="load_splash_message">Loading assets...</h1>
                </div>
            </div>
        </div>
        <canvas width="1080" height="600" id="map"></canvas>

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

        <div id="map_infoboxes">
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
                        <input type="number" class="form-control" name="input_current_row" id="input_current_row">
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

            <div id="map_materials" class="controls-section">
                <h4>Current Material:</h4>
                <a tabindex="10" id="current_material_container" class="inherit-link"></a>

                <div id="map_materials_panel" class="clearfix input-group">
                    <div class="card-header">Select a material</div>
                    <div id="map_materials_container" class="clearfix">
                        <div class="material-container ui-button clearfix" data-code="">
                            <div class="material-icon"></div>
                            <div class="material-title"></div>
                        </div>
                    </div>
                </div>


                <label for="input_safemode">Safe Mode:</label>
                <input type="checkbox" name="input_safemode" id="input_safemode" checked />
                <i class="fa fa-question-circle" id="help_safemode"></i>
            </div>

            <div class="controls-section">

            </div>
        </div>
    </main>


</div>
<footer id="footer" class="bg-dark text-light">
    <p>The web app Ultra Motherload is created by <a href="https://samleatherdale.github.io" target="_blank">Sam Leatherdale.</a> View the source <a href="https://github.com/samleatherdale/ultramotherload" target="_blank">here.</a></p>
    <p>The game Super Motherload is created by <a href="http://www.xgenstudios.com/" target="_blank">XGen Studios.</a> All game artworks and assets belong to them.</p>
</footer>

<!--Help-->
<div class="modal fade" id="help_modal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="exampleModalLabel">Ultra Motherload Help</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <p>Welcome to Ultra Motherload. Ultra Motherload is a map editor for the game Super Motherload, published by XGen Studios. It allows you to view and edit the contents of your map files, and make any changes quickly and simply. You could create some cool patterns with the materials, give yourself a bit of a boost, or even create a maze or some other kind of challenge!
                </p>
                <h5>Where are the map files stored?</h5>
                <p>The map files are stored in your user account's AppData folder:
                    <br>%AppData%\XGen Studios, Inc\Super Motherload\savedata\worldxx\map
                </p>
                <p>Each world should be numbered based on the order they were created. The map file has no extension, so when you're saving your changes, make sure the file is just called map. Even though the map file is edited locally, not uploaded, due to JavaScript sandboxing restrictions, the file will be "downloaded" when it is saved.
                </p>
                <p>This means you may get a popup, or it may just save automatically in your downloads folder. Most browsers will also append a (1) to the end of the filename if it already exists, so remove this if you want to replace the original. The map file must be saved with the same name and in the same location as the original if you want to see your changes in-game, so it's recommended to keep a backup copy just in case.
                </p>
                <h5>Why can't I see my changes in-game?</h5>
                <p>First of all, make sure you have saved the map file in the correct location, as explained above. If the game is running, you will need to exit to the main menu and reload the map. It is not recommended to change the map file while it is open in the game, quit to the main menu first before performing changes.</h5>
                <h5>Why are some tiles locked? What is Safe Mode?</h5>
                <p>Some tiles are locked because they have special meaning within the game. Tiles that lie within outposts, the final boss room, or act as markers shouldn't be edited, as they could cause problems in the game, like the final boss fight not starting properly, or the game crashing. If you really want to edit these tiles, you can disable Safe Mode, but it could corrupt your game save or progress. You have been warned.
                </p>
                <h5>Why is there a row of invisible barriers at the top of the map?</h5>
                <p>You have discovered the secret sky shop! This shop allows you to buy more upgrades to your vehicle than the shops in the outposts. To access the sky shop, you must fly all the way up and to the left of the map, then drive along the invisible barrier to the far right.</p>
                <h5>I'm having another issue not listed here.</h5>
                <p>Please report any other bugs and issues through the <a href="https://github.com/samleatherdale/ultramotherload" target="_blank">project's GitHub page</a>, or <a href="https://samleatherdale.github.io" target="_blank">contact me</a> via social media.</h3>
            </div>
        </div>
    </div>
</div>
</body>
</html>
