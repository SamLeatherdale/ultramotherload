//Insertion point
$(function() {
    // Check for the various File API support.
    if (!(window.File && window.FileReader)) {
        ShowLoadWarning("This browser doesn't support the JavaScript File APIs.");
        return;
    }

    setInterval(IconColorChange, ICON_COLOR_DELAY);
    LoadImages();
});

function Setup() {
    //Runs after load images is complete
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").change(LoadFile);
    $("#map_zoom").change(ZoomUpdate);
    $(window).resize(UpdateCanvasSize);

    $(".button-tool").click(SelectTool);
    $("#tool_select").click();

    $(".button-action").click(SelectAction);
    CheckActionState();

    $("#map_materials_container .material-container").click(SelectMaterial);
    $("#current_material_container").popover({
        content: $("#map_materials_container"),
        html: true,
        title: "Select a material",
        trigger: "focus"
    });
    $("#help_safemode").tooltip({
        title: "Safe mode prevents certain important tiles being edited. See help for more info."
    });
    $("#input_safemode").bootstrapSwitch({
        onColor: "success",
        offColor: "danger",
        onText: "On",
        offText: "Off",
        onSwitchChange: function(event, state) {
            safe_mode = state;
            if (!!last_selected) {
                last_selected.displayInfo();
            }
        }
    })
    $(".material-container:first-child").click(); //Select first material as default
    //$("#current_material_container").click(OpenMaterialPanel);

    $(document).on('keyup keydown', KeypressHandler);
    LoadDefaultMap();
}
