<?php
header('Cache-Control:no-cache');
header('Content-type: application/json');

include 'env.php';

$statement = $db->prepare('SELECT * FROM obj_summary ORDER BY desg + 0,desg');

$targets = array();
if ($result = $statement->execute()) {
    while ($row = $result->fetchArray()) {
        $m = array();
        $merr = array();
        if (!is_null($row['m'])) {
            $phots = array_map(null, $apertures, unpack($unpack, $row['m']),
                               unpack($unpack, $row['merr']));
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
            "ostat" => $row['ostat'],
            "ng" => $row["ng"],
            "nr" => $row["nr"],
            "ni" => $row["ni"]
        ));
    }
}

echo(json_encode($targets));
?>
