<?php
header('Cache-Control:no-cache');
$db = new SQLite3('foundobs.db');

$result = $db->query('SELECT DISTINCT desg FROM foundobs ORDER BY desg + 0,desg');
$targets = array();
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    array_push($targets, $row[0]);
}

echo(json_encode($targets));
?>
