<?php
date_default_timezone_set('Australia/Sydney');
$compile = TRUE;
$compile_pages = [
    "index.php" => "index.html",
    "js/_loader.php" => "ultra.js" 
];
foreach ($compile_pages as $source => $destination) {
    ob_start();
    include($source);
    $outfile = fopen($destination, "w") or die("Compile failed: access denied.");
    fwrite($outfile, ob_get_contents());
    fclose($outfile);
    ob_end_clean();
    echo "Compiled page ".$source." to ".$destination."\n";
}
