<?php
header('Cache-Control:no-cache');
header('Content-type: application/json');

$db = new SQLite3('/n/oort1/ZTF/zbrowser.db', SQLITE3_OPEN_READONLY);
$statement = $db->prepare('SELECT * FROM obj_summary ORDER BY desg + 0,desg');

# hard coded apertures for zchecker 2.4.3
# 18 by pixel, 5 by projected size
$apertures = array(
    2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    10000, 20000, 30000, 40000, 50000);

$targets = array();
if ($result = $statement->execute()) {
    while ($row = $result->fetchArray()) {
        $m = array();
        $merr = array();
        if (!is_null($row['m'])) {
            $phots = array_map(null, $apertures, unpack('f23', $row['m']),
                               unpack('f23', $row['merr']));
            foreach ($phots as &$phot) {
                $m[$phot[0]] = round($phot[1], 2);
                $merr[$phot[0]] = round($phot[2], 2);
            }
            unset($phot);
        }

        array_push($targets, array(
            "objid" => $row["objid"],
            "desg" => $row['desg'],
            "nobs" => $row["nobs"],
            "nnights" => $row["nnights"],
            "last_night" => $row["last_night"],
            "vmag" => $row["vmag"],
            "rh" => round($row["rh"], 2),
            "m" => $m,
            "merr" => $merr,
            "ng" => $row["ng"],
            "nr" => $row["nr"],
            "ni" => $row["ni"]
        ));
    }
}

echo(json_encode($targets));
?>
