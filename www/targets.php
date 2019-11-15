<?php
header('Cache-Control:no-cache');
include 'env.php';
$statement = $db->prepare('SELECT objid,desg FROM obj ORDER BY desg + 0,desg');
$result = $statement->execute();

$targets = array();
if ($result->numColumns()>0) {
    while ($row = $result->fetchArray(SQLITE3_NUM)) {
        $targets[$row[0]] = $row[1];
    }
}

echo(json_encode($targets));
?>
