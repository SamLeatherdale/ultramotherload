<?php
$compile = TRUE;
$compile_pages = array(
    "Home" => "index",
    "About" => "about"
);
foreach ($compile_pages as $page_name => $filename) {
    ob_start();
    include($filename.".php");
    $outfile = fopen($filename.".html", "w") or die("Compile failed: access denied.");
    fwrite($outfile, ob_get_contents());
    fclose($outfile);
    ob_end_clean();
    echo "Compiled page ".$filename.".php to ".$filename.".html\n";
}
