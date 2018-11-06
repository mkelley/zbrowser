<?php
header('Cache-Control:no-cache');
$db = new SQLite3('foundobs.db');
$data = array();

$data['nights'] = $db->querySingle('SELECT COUNT() FROM nights');
$data['nights with data'] = $db->querySingle('SELECT COUNT() FROM nights WHERE nframes != 0');
$data['most recent night checked'] = $db->querySingle('SELECT date FROM nights ORDER BY date DESC LIMIT 1');

$lastNightId = $db->querySingle('SELECT nightid FROM nights ORDER BY date DESC LIMIT 1');
$recentNights = date('Y-m-d', time() - 259200);

$data['targets with coverage'] = $db->querySingle('SELECT COUNT(DISTINCT desg) FROM foundobs');

$result = $db->query("SELECT desg,SUM(foundobs.nightid=".$lastNightId."),COUNT(),ROUND(AVG(rh), 1),ROUND(AVG(delta),1),CAST(ROUND(AVG(vmag)) AS INT) FROM foundobs INNER JOIN nights ON foundobs.nightid = nights.nightid WHERE date > '".$recentNights."' GROUP BY desg ORDER BY desg + 0,desg");
$data['target table'] = array();
$data['targets observed last night'] = array();
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    array_push($data['target table'], $row);
    if ($row[1] > 0) {
        array_push($data['targets observed last night'], $row[0]);
    }
}

$data['stacks'] = array();
$result = $db->query("SELECT desg,filtercode,stackfile,MAX(maglimit),AVG(rh) FROM nights LEFT JOIN foundobs ON nights.nightid=foundobs.nightid LEFT JOIN stacks ON foundobs.foundid=stacks.foundid WHERE nights.nightid=".$lastNightId." AND stacked>0 GROUP BY stackfile ORDER BY desg+0,desg");
if ($result) {
    while ($row = $result->fetchArray(SQLITE3_NUM)) {
        array_push($data['stacks'], $row);
    }
}

echo(json_encode($data));
?>
