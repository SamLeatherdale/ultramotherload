//Insertion point
import { debounce } from "lodash";
import { UpdateCanvasSize, ZoomUpdate } from "./canvas";
import { LoadDefaultMap, LoadFile, SaveFile } from "./io";
import {
    CheckActionState,
    CreateMaterialsPanel,
    KeypressHandler,
    SelectAction,
    SelectMaterial,
    SelectTool,
} from "./ui";
import { state } from "./globals";

const debounceUpdateCanvasSize = debounce(UpdateCanvasSize, 100);
export function Setup() {
    //Runs after load images is complete
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").on("change", (e) => LoadFile(e.target as HTMLInputElement));
    $("#map_zoom").on("change", ZoomUpdate);
    $(window).on("resize", debounceUpdateCanvasSize);

    $("#save_map").on("click", SaveFile);
    $(".button-tool").on("click", function () {
        SelectTool(this);
    });
    $("#tool_select").trigger("click");

    $(".button-action").on("click", function () {
        SelectAction(this);
    });
    CheckActionState();

    $("#map_materials_container .material-container").on("click", function () {
        SelectMaterial(this);
    });
    $("#current_material_container").popover({
        content: $("#map_materials_container"),
        html: true,
        title: "Select a material",
        trigger: "focus",
    });
    $("#help_safemode").tooltip({
        title: "Safe mode prevents certain important tiles being edited. See help for more info.",
    });
    $("#input_safemode").on("change", function () {
        state.safe_mode = (this as HTMLInputElement).checked;
        if (!!state.last_selected) {
            state.last_selected.displayInfo();
        }
    });
    $(".material-container:first-child").trigger("click"); //Select first material as default
    //$("#current_material_container").click(OpenMaterialPanel);

    $(document).on("keyup keydown", (e) => KeypressHandler(e.type, e.which!));
    LoadDefaultMap();
}
