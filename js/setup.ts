//Insertion point
import $ from "jquery";
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
    UpdateSafeModeUI,
} from "./ui";
import { state } from "./globals";

const debounceUpdateCanvasSize = debounce(UpdateCanvasSize, 100);
export function Setup() {
    //Runs after load images is complete
    CreateMaterialsPanel();
    UpdateCanvasSize();

    $("#map_file").on("change", (e) => LoadFile(e.target as HTMLInputElement));
    $("#load_error_close").on("click", () => $("#load_error").hide());
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

    $("#map_materials_container .material-container").on("mousedown", (event) => {
        // Chrome blurs the focused trigger on mousedown, and Bootstrap then
        // hides this popover before mouseup. With prefers-reduced-motion the
        // fade is skipped, so the click never lands and the selection stays put.
        event.preventDefault();
    });
    $("#map_materials_container .material-container").on("click", function () {
        SelectMaterial(this);
        const trigger = document.getElementById("current_material_container");
        if (trigger && document.activeElement === trigger) {
            trigger.blur();
        }
    });
    $("#current_material_container").popover({
        content: $("#map_materials_container"),
        html: true,
        title: "Select a material",
        trigger: "focus",
    });
    UpdateSafeModeUI();
    $("#button_safemode").on("click", function () {
        state.safe_mode = !state.safe_mode;
        UpdateSafeModeUI();
        if (state.last_selected) {
            state.last_selected.displayInfo();
        }
    });
    $("#map_materials_container .material-container:not(.experimental-material)")
        .first()
        .trigger("click"); //Select first safe material as default
    //$("#current_material_container").click(OpenMaterialPanel);

    $(document).on("keyup keydown", (e) => KeypressHandler(e.type, e.which!));
    LoadDefaultMap();
}
