//Insertion point
import { UpdateCanvasSize, ZoomUpdate } from "./canvas";
import { LoadDefaultMap, LoadFile, SaveFile } from "./io";
import { CheckActionState, CreateMaterialsPanel, KeypressHandler, SelectAction,
    SelectMaterial, SelectTool } from "./ui";
import * as globals from "./globals";


export function Setup() {
    //Runs after load images is complete
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").change(LoadFile);
    $("#map_zoom").change(ZoomUpdate);
    $(window).resize(UpdateCanvasSize);

    $("#save_map").click(SaveFile)
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
            globals.writeGlobals.safe_mode = state;
            if (!!globals.writeGlobals.last_selected) {
                globals.writeGlobals.last_selected.displayInfo();
            }
        }
    })
    $(".material-container:first-child").click(); //Select first material as default
    //$("#current_material_container").click(OpenMaterialPanel);

    $(document).on('keyup keydown', KeypressHandler);
    LoadDefaultMap();
}
