<?php
header('Cache-Control:no-cache');
$db = new SQLite3('/n/oort1/ZTF/zchecker.db', SQLITE3_OPEN_READONLY);
$data = array();

$data['nights'] = $db->querySingle(
    'SELECT COUNT() FROM ztf_nights');
$data['nights with data'] = $db->querySingle(
    'SELECT COUNT() FROM ztf_nights WHERE exposures != 0');

$row = $db->querySingle(
    'SELECT nightid,date FROM ztf_nights ORDER BY date DESC LIMIT 1');
$lastNightId = $row[0];
$data['most recent night checked'] = $row[1];

$lastNightId = $db->querySingle(
    'SELECT nightid FROM ztf_nights ORDER BY date DESC LIMIT 1');

$data['targets with coverage'] = $db->querySingle(
    'SELECT COUNT(DISTINCT objid) FROM ztf_found');

$data['most recent targets'] = $db->querySingle(
    "SELECT COUNT() FROM ztf_found WHERE nightid=".$lastNightId);

echo(json_encode($data));
?>
