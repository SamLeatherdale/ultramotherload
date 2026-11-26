//UI functions
import $ from "jquery";
import { throttle } from "lodash";
import { getMaterialIconKey, getTileSpriteRect } from "./autotile";
import { Redraw } from "./canvas";
import type { Cell } from "./cell";
import * as globals from "./globals";
import { mapSections, state } from "./globals";
import { getCell, getRandomInt } from "./helper";
import { tileManifest, tilesSheetUrl } from "./images";

let scrollbarReady = false;

export function CreateScrollbar() {
    const root = document.getElementById("map_scrollbar");
    if (!root) {
        return;
    }
    ensureScrollbar(root);
    renderScrollbar(root);
}

function ensureScrollbar(root: HTMLElement) {
    if (scrollbarReady) {
        return;
    }
    scrollbarReady = true;
    root.setAttribute("role", "scrollbar");
    root.setAttribute("aria-orientation", "vertical");
    root.setAttribute("aria-label", "Map position");
    root.setAttribute("aria-controls", "map");
    root.tabIndex = 0;

    const track = document.createElement("div");
    track.className = "map-scroll-track";
    const bands = document.createElement("div");
    bands.className = "map-scroll-bands";
    const windowEl = document.createElement("div");
    windowEl.className = "map-scroll-window";
    track.append(bands, windowEl);

    const thumb = document.createElement("div");
    thumb.className = "map-scroll-thumb";
    thumb.textContent = "0";

    const markers = document.createElement("div");
    markers.className = "map-scroll-markers";
    root.replaceChildren(track, thumb, markers);

    root.addEventListener("keydown", onScrollbarKeydown);
    track.addEventListener("pointerdown", onTrackPointerDown);
    markers.addEventListener("click", onMarkerClick);
}

function renderScrollbar(root: HTMLElement) {
    const bands = root.querySelector(".map-scroll-bands");
    const markers = root.querySelector(".map-scroll-markers");
    if (!(bands instanceof HTMLElement) || !(markers instanceof HTMLElement)) {
        return;
    }
    if (state.total_rows <= 0) {
        return;
    }
    const sections = mapSections();
    const stops: string[] = [];
    for (const section of sections) {
        const start = (section.startRow / state.total_rows) * 100;
        const end = ((section.endRow + 1) / state.total_rows) * 100;
        stops.push(`${section.color} ${start}%`, `${section.color} ${end}%`);
    }
    bands.style.background = `linear-gradient(to bottom, ${stops.join(", ")})`;

    markers.replaceChildren(
        ...sections.map((section, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "map-scroll-marker";
            button.dataset.row = String(section.startRow);
            if (index === sections.length - 1) {
                button.dataset.edge = "end";
            }
            button.setAttribute("aria-label", `Jump to ${section.label}`);
            button.textContent = section.label;
            return button;
        }),
    );
    layoutMarkers();
    requestAnimationFrame(layoutMarkers);
    syncScrollbar();
}

function layoutMarkers() {
    const track = document.querySelector("#map_scrollbar .map-scroll-track");
    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".map-scroll-marker")];
    if (!(track instanceof HTMLElement) || state.total_rows <= 0 || buttons.length === 0) {
        return;
    }
    const height = track.clientHeight;
    if (height <= 0) {
        return;
    }
    const gap = 4;
    const placed = buttons.map((button) => ({
        button,
        top: (Number(button.dataset.row) / state.total_rows) * height,
        height: button.offsetHeight,
    }));
    for (let index = 0; index < placed.length; index++) {
        const minTop = index === 0 ? 0 : placed[index - 1].top + placed[index - 1].height + gap;
        placed[index].top = Math.max(placed[index].top, minTop);
    }
    const last = placed[placed.length - 1];
    if (last && last.top + last.height > height) {
        last.top = Math.max(0, height - last.height);
        for (let index = placed.length - 2; index >= 0; index--) {
            const maxBottom = placed[index + 1].top - gap;
            if (placed[index].top + placed[index].height > maxBottom) {
                placed[index].top = Math.max(0, maxBottom - placed[index].height);
            }
        }
    }
    for (const item of placed) {
        item.button.style.top = `${item.top}px`;
    }
}

function syncScrollbar() {
    const root = document.getElementById("map_scrollbar");
    const track = root?.querySelector(".map-scroll-track");
    const thumb = root?.querySelector(".map-scroll-thumb");
    const windowEl = root?.querySelector(".map-scroll-window");
    if (
        !(root instanceof HTMLElement) ||
        !(track instanceof HTMLElement) ||
        !(thumb instanceof HTMLElement) ||
        !(windowEl instanceof HTMLElement) ||
        state.total_rows <= 0
    ) {
        return;
    }
    const height = track.clientHeight;
    root.setAttribute("aria-valuemin", "0");
    root.setAttribute("aria-valuemax", String(Math.max(0, state.max_view_rows)));
    root.setAttribute("aria-valuenow", String(state.current_row));
    root.setAttribute("aria-valuetext", `Row ${state.current_row}`);
    thumb.textContent = String(state.current_row);
    if (height <= 0) {
        return;
    }
    const topPx = (state.current_row / state.total_rows) * height;
    const windowHeight = Math.max(4, (state.rows_per_view / state.total_rows) * height);
    windowEl.style.top = `${topPx}px`;
    windowEl.style.height = `${windowHeight}px`;
    const knobHeight = thumb.offsetHeight || 22;
    const knobTop = Math.min(Math.max(0, topPx - knobHeight / 2), Math.max(0, height - knobHeight));
    thumb.style.top = `${knobTop}px`;
}

function rowFromTrackY(track: HTMLElement, clientY: number) {
    const rect = track.getBoundingClientRect();
    const ratio = rect.height <= 0 ? 0 : (clientY - rect.top) / rect.height;
    return ratio * state.total_rows;
}

function onTrackPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !(event.currentTarget instanceof HTMLElement)) {
        return;
    }
    const track = event.currentTarget;
    const originY = event.clientY;
    const originRow = state.current_row;
    const pointerId = event.pointerId;
    let dragged = false;
    const root = document.getElementById("map_scrollbar");
    try {
        track.setPointerCapture(pointerId);
    } catch {
        // A pointer that is already gone cannot be captured. The move listeners still apply.
    }
    root?.classList.add("is-dragging");
    const move = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) {
            return;
        }
        if (!dragged && Math.abs(ev.clientY - originY) < 4) {
            return;
        }
        dragged = true;
        const rect = track.getBoundingClientRect();
        const delta =
            rect.height <= 0 ? 0 : ((ev.clientY - originY) / rect.height) * state.total_rows;
        UpdateCurrentRow(Math.round(originRow + delta), true);
    };
    const end = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) {
            return;
        }
        track.removeEventListener("pointermove", move);
        track.removeEventListener("pointerup", end);
        track.removeEventListener("pointercancel", end);
        root?.classList.remove("is-dragging");
        if (dragged) {
            UpdateCurrentRow(state.current_row);
            return;
        }
        const row = rowFromTrackY(track, ev.clientY) - state.rows_per_view / 2;
        UpdateCurrentRow(Math.round(row));
    };
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
}

function onMarkerClick(event: Event) {
    const button = (event.target as HTMLElement | null)?.closest("button[data-row]");
    if (!(button instanceof HTMLButtonElement)) {
        return;
    }
    UpdateCurrentRow(Number(button.dataset.row));
}

function onScrollbarKeydown(event: KeyboardEvent) {
    let next = state.current_row;
    if (event.key === "ArrowDown") {
        next += event.shiftKey ? 20 : 1;
    } else if (event.key === "ArrowUp") {
        next -= event.shiftKey ? 20 : 1;
    } else if (event.key === "PageDown") {
        next += state.rows_per_view;
    } else if (event.key === "PageUp") {
        next -= state.rows_per_view;
    } else if (event.key === "Home") {
        next = 0;
    } else if (event.key === "End") {
        next = state.max_view_rows;
    } else {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    UpdateCurrentRow(next);
}

export function ScrollbarOnScroll(event: JQueryMousewheel.JQueryMousewheelEventObject) {
    event.preventDefault();
    var SCROLL_FACTOR = 5;
    var newvalue = state.current_row - event.deltaY * SCROLL_FACTOR;
    UpdateCurrentRow(newvalue, true);
}

export function ScrollButtonOnClick(target: HTMLElement) {
    var id = $(target).attr("id");
    if (id == "map_upmany") {
        UpdateCurrentRow(state.current_row - state.rows_per_view);
    } else if (id == "map_upone") {
        UpdateCurrentRow(state.current_row - 1);
    } else if (id == "map_downone") {
        UpdateCurrentRow(state.current_row + 1);
    } else if (id == "map_downmany") {
        UpdateCurrentRow(state.current_row + state.rows_per_view);
    }
}

const throttledRedraw = throttle(Redraw, 16, {
    leading: true,
    trailing: true,
});

export function UpdateCurrentRow(newvalue: number, debounce?: boolean) {
    //console.log("Current row: " + newvalue);
    if (newvalue < 0) {
        state.current_row = 0;
    } else if (newvalue > state.max_view_rows) {
        state.current_row = state.max_view_rows;
    } else {
        state.current_row = newvalue;
    }
    syncScrollbar();
    $("#input_current_row").val(state.current_row);
    $("#max_rows").text(`/ ${state.max_view_rows}`);
    const current_row_relative = globals.ROWS_ABOVE_SURFACE - state.current_row;
    $("#input_current_depth").val(Math.round(current_row_relative * globals.INGAME_DEPTH_RATIO));
    if (debounce) {
        throttledRedraw();
    } else {
        Redraw();
    }
}

let materialsContainer: JQuery<HTMLElement>;

export function CreateMaterialsPanel() {
    materialsContainer = $("#map_materials_container");
    const template = materialsContainer.find(".material-container:first-child").detach();

    for (const [categoryName, categoryMaterials] of Object.entries(globals.MATERIAL_CATEGORIES)) {
        const isExperimental = categoryName === "Experimental";
        const heading = $('<div class="material-category-header"></div>').text(categoryName);
        if (isExperimental) {
            heading.addClass("experimental-material");
        }
        materialsContainer.append(heading);

        for (const [code, name] of Object.entries(categoryMaterials)) {
            const m = template.clone();
            m.attr("data-code", code);
            if (isExperimental) {
                m.addClass("experimental-material");
            }
            const iconSize = 30;
            const rect = getTileSpriteRect(getMaterialIconKey(code), 0, 0);
            m.find(".material-icon").css({
                backgroundImage: `url(${tilesSheetUrl})`,
                backgroundSize: `${tileManifest.cols * iconSize}px ${tileManifest.rows * iconSize}px`,
                backgroundPosition: `-${rect.col * iconSize}px -${rect.row * iconSize}px`,
            });
            m.find(".material-title").text(name);
            materialsContainer.append(m);
        }
    }
    UpdateMaterialsPanelVisibility();
}

export function UpdateSafeModeUI() {
    const button = $("#button_safemode");
    button
        .toggleClass("btn-success", state.safe_mode)
        .toggleClass("btn-danger", !state.safe_mode)
        .attr("aria-pressed", String(state.safe_mode));
    button
        .find("i")
        .toggleClass("fa-lock", state.safe_mode)
        .toggleClass("fa-unlock", !state.safe_mode);
    button.find("span").text(state.safe_mode ? "Safe Mode: On" : "Safe Mode: Off");
    UpdateMaterialsPanelVisibility();
}

export function UpdateMaterialsPanelVisibility() {
    if (!materialsContainer) {
        return;
    }
    materialsContainer.find(".experimental-material").toggle(!state.safe_mode);
    if (state.safe_mode && globals.EXPERIMENTAL_MATERIALS.has(overwrite_code)) {
        materialsContainer
            .find(".material-container:not(.experimental-material)")
            .first()
            .trigger("click");
    }
}

let overwrite_code: string;

export function SelectMaterial(target: HTMLElement) {
    $("#current_material_container").empty();
    $(target).clone().appendTo($("#current_material_container"));
    overwrite_code = $(target).attr("data-code") as string;
}

export function SelectTool(target: HTMLElement) {
    state.selected_tool = target.id;
    document.querySelectorAll<HTMLButtonElement>(".button-tool").forEach((button) => {
        button.setAttribute("aria-pressed", button === target ? "true" : "false");
    });
    const map = document.getElementById("map");
    map?.classList.toggle("cursor-pointer", state.selected_tool === "tool_overwrite");
    map?.classList.toggle("cursor-select", state.selected_tool === "tool_select");
}

type TileEdit = { id: number; before: string; after: string };

let undoStep: TileEdit[] | null = null;
let redoStep: TileEdit[] | null = null;

function cellById(id: number) {
    const row = Math.floor(id / globals.COLS_PER_ROW);
    const col = id % globals.COLS_PER_ROW;
    return state.map[row]?.[col];
}

function applyEdit(step: TileEdit[], direction: "before" | "after") {
    for (const change of step) {
        const cell = cellById(change.id);
        if (!cell) {
            continue;
        }
        cell.code = change[direction];
        cell.hexcode = cell.code + cell.color;
        cell.modified = true;
        if (state.last_selected?.id === cell.id) {
            cell.displayInfo();
        }
    }
    Redraw();
}

function updateHistoryButtons() {
    $("#action_undo").toggleClass("ui-state-disabled", undoStep === null);
    $("#action_redo").toggleClass("ui-state-disabled", redoStep === null);
}

export function clearHistory() {
    undoStep = null;
    redoStep = null;
    updateHistoryButtons();
}

function editCells(cells: Cell[], mutate: (cell: Cell) => void) {
    const before = cells.map((cell) => ({ id: cell.id, code: cell.code }));
    for (const cell of cells) {
        mutate(cell);
    }
    const changes: TileEdit[] = [];
    for (const snap of before) {
        const cell = cellById(snap.id);
        if (!cell || cell.code === snap.code) {
            continue;
        }
        changes.push({ id: snap.id, before: snap.code, after: cell.code });
    }
    if (changes.length === 0) {
        return;
    }
    undoStep = changes;
    redoStep = null;
    updateHistoryButtons();
}

function undoEdit() {
    if (!undoStep) {
        return;
    }
    applyEdit(undoStep, "before");
    redoStep = undoStep;
    undoStep = null;
    updateHistoryButtons();
}

function redoEdit() {
    if (!redoStep) {
        return;
    }
    applyEdit(redoStep, "after");
    undoStep = redoStep;
    redoStep = null;
    updateHistoryButtons();
}

export function replaceSelectedCells() {
    editCells(Object.values(state.selected_cells), (cell) => cell.updateCode(overwrite_code));
    Redraw();
}

export function SelectAction(target: HTMLElement) {
    if ($(target).hasClass("ui-state-disabled")) {
        return;
    }
    const action = $(target).attr("id");
    if (action == "action_undo") {
        undoEdit();
    } else if (action == "action_redo") {
        redoEdit();
    } else if (action == "action_replace") {
        replaceSelectedCells();
    } else if (action == "action_copy") {
        if (state.current_action == "action_copy") {
            //We are cancelling copy
            state.current_action = undefined;
            state.paste_cells = {};
            Redraw();
        } else {
            state.current_action = "action_copy";
            state.paste_cells = state.selected_cells;
            Redraw();
        }
    } else if (action == "action_paste") {
        const pasted = Object.values(state.paste_cells);
        editCells(pasted, (cell) => {
            if (cell.paste_code) {
                cell.updateCode(cell.paste_code);
                cell.paste_code = "";
            }
        });
        state.selected_cells = state.paste_cells;
        state.paste_cells = {};
        Redraw();
        state.current_action = undefined;
    } else if (action == "action_clear") {
        editCells(Object.values(state.selected_cells), (cell) => cell.clear());
        Redraw();
    }
    CheckActionState();
}

export function CheckActionState() {
    if (Object.keys(state.selected_cells).length == 0) {
        $(".button-action").addClass("ui-state-disabled");
    } else {
        $("#action_paste").addClass("ui-state-disabled");
        $(".button-action:not(#action_paste)").removeClass("ui-state-disabled");
    }
    if (state.current_action == "action_copy") {
        $("#action_copy span").text("Cancel");
        $("#action_replace").addClass("ui-state-disabled");
        $(".button-action:not(#action_replace)").removeClass("ui-state-disabled");
    } else {
        $("#action_copy span").text("Copy");
    }
}

export function KeypressHandler(type: string, key: number) {
    const pressed = type == "keydown";

    //Save current state for other functions
    if (key == 16) {
        //Shift
        globals.keys.shift = pressed;
        return;
    } else if (key == 17) {
        //Ctrl
        globals.keys.control = pressed;
        return;
    }

    //Otherwise, handle immediately
    if (!pressed) {
        return;
    }

    if (globals.keys.control) {
        const typing =
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement;
        if (!typing && (key == 90 || key == 89)) {
            if (key == 89 || globals.keys.shift) {
                redoEdit();
            } else {
                undoEdit();
            }
            return;
        }
        if (key == 67) {
            //C
            $("#action_copy").click();
            return;
        } else if (key == 86) {
            //V
            $("#action_paste").click();
            return;
        }
    }

    if ((key == 33 || key == 34 || (key >= 37 && key <= 40)) && !!state.last_selected) {
        //Arrow keys
        var move_row = 0;
        var move_col = 0;

        if (key == 37) {
            //Left
            move_col = -1;
        } else if (key == 38) {
            //Up
            move_row = -1;
        } else if (key == 39) {
            //Right
            move_col = 1;
        } else if (key == 40) {
            //Down
            move_row = 1;
        } else if (key == 33) {
            //Page Up
            move_row = -10;
        } else if (key == 34) {
            //Page Down
            move_row = 10;
        }
        var target = getCell(
            state.last_selected.row + move_row,
            state.last_selected.col + move_col,
            true,
        );
        if (!target) {
            console.warn("Cell out of range");
            return;
        }
        //Check if we've gone off the viewport
        if (
            target.row < state.current_row ||
            target.row >= state.current_row + state.rows_per_view
        ) {
            UpdateCurrentRow(state.current_row + move_row);
        }
        target.click();
        return;
    }

    if (key == 45) {
        //Insert
        replaceSelectedCells();
        return;
    } else if (key == 46) {
        //Delete
        $("#action_clear").click();
        return;
    }

    console.log(key);
}

class IconColor {
    constructor(
        public fill: string,
        public stroke: string,
    ) {}
}

export var icon_colors = [
    new IconColor("#3fffad", "#00c984"), //Green
    new IconColor("#ff6a7b", "#c92800"), //Red
    new IconColor("#2a9dff", "#1f5fff"), //Blue
    new IconColor("#e154ff", "#9300bf"), //Purple
    new IconColor("#ffb90a", "#f4a700"), //Orange
];
export var current_icon_color = icon_colors[0];

export function IconColorChange() {
    let newcolor: IconColor | undefined = undefined;
    while (!newcolor || newcolor.fill == current_icon_color.fill) {
        newcolor = icon_colors[getRandomInt(0, icon_colors.length)];
    }
    current_icon_color = newcolor;
    $("#header_logo").attr(newcolor); //Sets attributes
}

export function ShowLoadWarning(warning: string) {
    if ($("#map").is(":visible")) {
        $("#load_error_message").text(`${warning} The map you have open was not changed.`);
        $("#load_error").show();
        return;
    }

    $("#load_splash_content").addClass("text-danger");
    $("#load_splash_icon").hide();
    $("#load_splash_warning").show();
    $("#load_splash_message").text(warning);
}

export function ClearLoadWarning() {
    $("#load_error").hide();
    $("#load_error_message").text("");
}
