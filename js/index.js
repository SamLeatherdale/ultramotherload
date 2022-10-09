import "jquery-ui/dist/themes/base/jquery-ui.min.css"
import "popper.js/dist/popper.min"

import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap/dist/js/bootstrap.min"

import "bootstrap-toggle/css/bootstrap2-toggle.min.css"
import "bootstrap-switch/dist/js/bootstrap-switch.min"
import "bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.min.css"


import "font-awesome/css/font-awesome.min.css"

import { IconColorChange, ShowLoadWarning } from "./ui";
import { LoadImages } from "./io";

var ICON_COLOR_DELAY = 5000;

function main() {
    // Check for the various File API support.
    if (!(window.File && window.FileReader)) {
        ShowLoadWarning("This browser doesn't support the JavaScript File APIs.");
        return;
    }

    setInterval(IconColorChange, ICON_COLOR_DELAY);
    LoadImages();
}
main()