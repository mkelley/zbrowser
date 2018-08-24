<?php
# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);
$db = new SQLite3('foundobs.db');

header('Cache-Control:no-cache');

$targets = array();
$result = $db->query('SELECT DISTINCT desg FROM foundobs');
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    array_push($targets, $row[0]);
}

$data = array();

if (in_array($query['target'], $targets)) {
    $data['valid'] = true;
    $data['target'] = $query['target'];
    $data['table'] = array();

    $result = $db->query("SELECT desg,date,dra,ddec,ra3sig,dec3sig,vmag,rh,rdot,delta,phase,trueanomaly,tmtp,filtercode FROM foundobs INNER JOIN nights ON foundobs.nightid=nights.nightid WHERE desg='".$query['target']."' ORDER BY obsjd DESC");
    while($row = $result->fetchArray()) {
        $rh = $row['rh'];
        if ($row['rdot'] < 0) {
            $rh = -1 * $rh;
        }
        
        array_push($data['table'], array(
            str_replace(' ', '&nbsp;', $row['desg']),
            str_replace('-', '&#8209;', $row['date']),
            $row['filtercode'],
            round(hypot($row['dra'], $row['ddec']) * 3600, 2),
            round(hypot($row['ra3sig'], $row['dec3sig']), 2),
            round($row['vmag'], 1),
            round($rh, 3),
            round($row['delta'], 3),
            round($row['phase'], 1),
            round($row['trueanomaly'], 1),
            round($row['tmtp'], 1)
        ));
    }

    $data['stacks'] = array();
    $result = $db->query("SELECT DISTINCT stackfile,MAX(maglimit),AVG(rh) FROM stacks INNER JOIN foundobs ON stacks.foundid=foundobs.foundid WHERE desg='".$query['target']."' AND stackfile IS NOT NULL AND stackfile != '' GROUP BY stackfile ORDER BY stackfile DESC");
    while ($row = $result->fetchArray(SQLITE3_NUM)) {
        array_push($data['stacks'], array(
            $row[0],
            round($row[1], 1),
            round($row[2], 3)
        ));
    }
} else {
    $data['valid'] = false;
}

echo(json_encode($data));
?>
