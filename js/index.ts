import "popper.js/dist/popper.min";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.min";

import "jquery-ui/dist/themes/base/jquery-ui.min.css";
import "font-awesome/css/font-awesome.min.css";

import mousewheel from "jquery-mousewheel";
mousewheel($);

import { IconColorChange, ShowLoadWarning } from "./ui";
import { LoadImages } from "./io";

var ICON_COLOR_DELAY = 5000;

function main() {
    // Check for the various File API support.
    if (!(window.File && window.FileReader)) {
        ShowLoadWarning(
            "This browser doesn't support the JavaScript File APIs.",
        );
        return;
    }

    setInterval(IconColorChange, ICON_COLOR_DELAY);
    LoadImages();
}
main();
