<?php
header('Cache-Control:no-cache');
header('Content-type: application/json');

include 'env.php';

# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);

$data = array();
$data['valid'] = false;
$desg = false;
$objid = false;

if (array_key_exists('target', $query)) {
    $desg = $query['target'];
    $data['target'] = $desg;

    $statement = $db->prepare('SELECT objid FROM obj WHERE desg=:desg');
    $statement->bindValue(':desg', $desg, SQLITE3_TEXT);
    if ($result = $statement->execute()) {
        $row = $result->fetchArray();
        $objid = $row[0];
    }
}

if ($objid) {
    $data['valid'] = true;
    $data['objid'] = $objid;
    $data['table'] = array();
    $statement = $db->prepare(
        'SELECT * FROM ztf_found WHERE objid=:objid ORDER BY obsdate DESC'
    );
    $statement->bindValue(':objid', $objid, SQLITE3_INTEGER);

    if ($result = $statement->execute()) {
        while($row = $result->fetchArray()) {
            $rh = $row['rh'];
            if ($row['rdot'] < 0) {
                $rh = -1 * $rh;
            }

            if (is_null($row['m'])) {
                continue;
            } else {
                $phots = array_map(null, $apertures, unpack($unpack, $row['m']),
                                   unpack($unpack, $row['merr']));
                $m = array();
                $merr = array();
                foreach ($phots as &$phot) {
                    $m[$phot[0]] = round($phot[1], 2);
                    $merr[$phot[0]] = round($phot[2], 2);
                }
                unset($phot);
            }

            array_push($data['table'], array(
                "obsdate" => $row['obsdate'],
                "programid" => $row['programid'],
                "rh" => round($rh, 3),
                "delta" => round($row['delta'], 3),
                "phase" => round($row['phase'], 1),
                "tmtp" => round($row['tmtp'], 2),
                "ephUnc" => round(hypot($row['ra3sig'], $row['dec3sig']), 2),
                "cenOffset" => round(hypot($row['dx'], $row['dy']), 2),
                "V" => round($row['vmag'], 2),
                "filter" => $row['filtercode'],
                "airmass" => $row['airmass'],
                "seeing" => $row['seeing'],
                "m" => $m,
                "merr" => $merr,
                "flag" => $row['flag'],
                "ostat" => $row['ostat'],
                "infobits" => $row['infobits'],
                "archivefile" => $row['archivefile']
            ));
        }
    }
}

echo(json_encode($data));
?>
