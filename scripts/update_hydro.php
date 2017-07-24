<?php

// -------------------------------------------------------------------------------------------------
// CydYnni bulk importer
// -------------------------------------------------------------------------------------------------

define('EMONCMS_EXEC', 1);
chdir("/var/www/cydynni");
require "settings.php";
require "meter_data_api.php";
require "EmonLogger.php";
require "PHPFina.php";

$phpfina = new PHPFina(array("datadir"=>"/var/lib/phpfina/"));

$end = time();
$start = $end - (3600*24*7);

// DateTime used for visual check
$date = new DateTime();
$date->setTimezone(new DateTimeZone("Europe/London"));

$meta = $phpfina->get_meta(1);
$start = $meta->start_time + ($meta->interval * $meta->npoints);

print $start." ".$end." ".(($end-$start)/3600)."\n";

// Itterate from start time throught to present time
// Extend the query time forward one month to capture present month

$endms = $end * 1000;
$startms = $start * 1000;

$data = get_meter_data_history($meter_data_api_baseurl,$meter_data_api_hydrotoken,28,$startms,$endms);

if (count($data)) {
    // Visual output to check that we are not missing data in our queries
    // Start time of data
    $date->setTimestamp($data[0][0]*0.001);
    print $date->format('Y-m-d H:i:s')."\n";
    // End time of data
    $date->setTimestamp($data[count($data)-1][0]*0.001);
    print $date->format('Y-m-d H:i:s')."\n";
    // Number of half hours in result
    print count($data)."\n";

    // Insert data in PHPFina Timeseries
    for ($i=0; $i<count($data); $i++) {
       $phpfina->post(1,$data[$i][0]*0.001,$data[$i][1],null);
    }
}
