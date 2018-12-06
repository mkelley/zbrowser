<?php
header('Cache-Control:no-cache');
$db = new SQLite3('zchecker.db');

$result = $db->query('SELECT objid,desg FROM obj ORDER BY desg + 0,desg');
$targets = array();
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    $targets[$row[0]] = $row[1];
}

echo(json_encode($targets));
?>
