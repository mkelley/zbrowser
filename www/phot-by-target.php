<?php
header('Cache-Control:no-cache');
header('Content-type: application/json');

# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);
$db = new SQLite3('/n/oort1/ZTF/zbrowser.db', SQLITE3_OPEN_READONLY);

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

    # hard coded apertures for zchecker 2.4.3
    # 18 by pixel, 5 by projected size
    $apertures = array(
        2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        10000, 20000, 30000, 40000, 50000);

    if ($result = $statement->execute()) {
        while($row = $result->fetchArray()) {
            $rh = $row['rh'];
            if ($row['rdot'] < 0) {
                $rh = -1 * $rh;
            }

            if (is_null($row['m'])) {
                continue;
            } else {
                $phots = array_map(null, $apertures, unpack('f23', $row['m']),
                                   unpack('f23', $row['merr']));
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
                "rh" => round($rh, 3),
                "delta" => round($row['delta'], 3),
                "phase" => round($row['phase'], 1),
                "tmtp" => round($row['tmtp'], 1),
                "ephUnc" => round(hypot($row['ra3sig'], $row['dec3sig']), 2),
                "cenOffset" => round(hypot($row['dx'], $row['dy']), 2),
                "V" => round($row['vmag'], 1),
                "filter" => $row['filtercode'],
                "m" => $m,
                "merr" => $merr,
                "flag" => $row['flag'],
                "infobits" => $row['infobits']
            ));
        }
    }
}

echo(json_encode($data));
?>
