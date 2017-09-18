<?php

define('EMONCMS_EXEC', 1);
chdir("/var/www/emoncms");
require "process_settings.php";
require "Lib/EmonLogger.php";

// -------------------------------------------------------------------------
// MQTT Connect
// -------------------------------------------------------------------------
$mqtt_client = new Mosquitto\Client();

$connected = false;
$mqtt_client->onConnect('connect');
$mqtt_client->onDisconnect('disconnect');

// -------------------------------------------------------------------------
// Redis Connect
// -------------------------------------------------------------------------
require "$homedir/cydynni/scripts-hub/scheduler.php";

$redis = new Redis();
if (!$redis->connect($redis_server['host'], $redis_server['port'])) { echo "Can't connect to redis"; die; }

if (!empty($redis_server['prefix'])) $redis->setOption(Redis::OPT_PREFIX, $redis_server['prefix']);
if (!empty($redis_server['auth']) && !$redis->auth($redis_server['auth'])) {
    echo "Can't connect to redis, autentication failed"; die;
}

// -------------------------------------------------------------------------
// Control Loop
// -------------------------------------------------------------------------
$laststatus = array();
$lasttime = 0;
$last_retry = 0;

while(true) 
{
    $now = time();

    if (($now-$lasttime)>=10) {
        $lasttime = $now;

        // Get time of start of day
        $date = new DateTime();
        $date->setTimezone(new DateTimeZone("Europe/London"));
        $date->setTimestamp($now);
        $date->modify("midnight");
        $daystart = $date->getTimestamp();
        $second_in_day = $now - $daystart;

        // Schedule definition
        $schedules = json_decode($redis->get("schedules"));

        foreach ($schedules as $schedule)
        {
            $device = $schedule->device;
            print "Schedule:$device";
            $status = 0;
            
            $active_pid = -1;
            
            foreach ($schedule->periods as $pid=>$period) {
                $start = ($period->start * 3600);
                $end = ($period->end * 3600);
                
                if ($start<$end) {
                    if ($second_in_day>=$start && $second_in_day<$end) $status = 1;
                } else {
                    if ($second_in_day>=$start && $second_in_day<24*3600) $status = 1;
                    if ($second_in_day>=0 && $second_in_day<$end) $status = 1;
                }
                
                if ($status) $active_pid = $pid; 
            }
            
            // If runonce is true, check if within 24h period
            if ($schedule->runonce!==false) {
                if (($now-$schedule->runonce)>(24*3600)) $status = 0;
            } else {
                // Check if schedule should be ran on this day
                if (!$schedule->repeat[$date->format("N")-1]) $status = 0;
            }

            print " status:$status";
            
            if (isset($laststatus[$device])) {
                print " $active_pid:$laststatus[$device]";
                print " ".json_encode($schedule->periods);
                
                if ($laststatus[$device]!=-1 && $active_pid==-1) {
                    print "remove $laststatus[$device]\n";
                    unset($schedule->periods[$laststatus[$device]]);
                    if (count($schedule->periods)==0) {
                        $schedules = array();
                        
                        $r = schedule($schedule);
                        $schedule->periods = $r["periods"];
                        $schedule->probability = $r["probability"];
                    
                        $schedules[] = $schedule;
                        $redis->set("schedules",json_encode($schedules));
                    }
                }
            }
            
            print "\n";
            
            // Publish to MQTT
            if ($connected) $mqtt_client->publish("emon/$device/status",$status,0);
            
            $laststatus[$device] = $active_pid;
        }
    }
    
    // MQTT Connect or Reconnect
    if (!$connected && (time()-$last_retry)>5.0) {
        $last_retry = time();
        try {
            $mqtt_client->setCredentials($mqtt_server['user'],$mqtt_server['password']);
            $mqtt_client->connect($mqtt_server['host'], $mqtt_server['port'], 5);
        } catch (Exception $e) { }
    }
    try { $mqtt_client->loop(); } catch (Exception $e) { }
    
    // Dont loop to fast
    sleep(1);
}

function connect($r, $message) {
    global $connected; $connected = true;
}

function disconnect() {
    global $connected; $connected = false;
}
