<?php
# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);
$db = new SQLite3('zchecker.db');

header('Cache-Control:no-cache');

if (isset($query['date'])) {
    if (preg_match('/20[12][0-9]-[01][0-9]-[0123][0-9]/', $query['date'])) {
        $date = $query['date'];
    } else {
        $data['valid'] = false;
    }
} else {
    $d = new DateTime("now", new DateTimeZone("UTC"));
    $date = $d->format('Y-m-d');
}

$data['valid'] = true;
$data['date'] = $date;
$data['table'] = array();

$nightId = $db->querySingle('SELECT nightid FROM ztf_nights WHERE date="'.$date.'"');

$result = $db->query('SELECT desg,obsdate,ra,dec,dra,ddec,ra3sig,dec3sig,vmag,rh,rdot,delta,phase,trueanomaly,tmtp,filtercode,filefracday,field,ccdid,qid FROM ztf_found INNER JOIN obj USING (objid) WHERE nightid='.$nightId.' ORDER BY desg+0,desg');

while($row = $result->fetchArray()) {
    $rh = $row['rh'];
    if ($row['rdot'] < 0) {
        $rh = -1 * $rh;
    }

    $url = sprintf(
        'https://irsa.ipac.caltech.edu/ibe/data/ztf/products/sci/%s/%s/%s/ztf_%s_%06d_%s_c%02d_o_q%1d_',
        substr($row['filefracday'], 0, 4),
        substr($row['filefracday'], 4, 4),
        substr($row['filefracday'], 8),
        $row['filefracday'],
        $row['field'],
        $row['filtercode'],
        $row['ccdid'],
        $row['qid']);

    array_push($data['table'], array(
        str_replace(' ', '&nbsp;', $row['desg']),
        str_replace(' ', '&nbsp;', str_replace('-', '&#8209;', substr($row['obsdate'], 0, 16))),
        $row['filtercode'],
        $row['ra'],
        $row['dec'],
        round(hypot($row['dra'], $row['ddec']), 2),
        round(hypot($row['ra3sig'], $row['dec3sig']), 2),
        round($row['vmag'], 1),
        round($rh, 3),
        round($row['delta'], 3),
        round($row['phase'], 1),
        round($row['tmtp'], 1),
        '<a href="' . $url . 'sciimg.fits">sci</a> <a href="'
        . $url . 'scimrefdiffimg.fits.fz">diff</a>'
    ));
}

$data['stacks'] = array();
$result = $db->query("SELECT stackfile,desg,filtercode,ROUND(MAX(maglimit),1),ROUND(AVG(rh),3) FROM ztf_stacks INNER JOIN ztf_cutouts USING (stackid) INNER JOIN ztf_found USING (foundid) INNER JOIN obj USING (objid) WHERE nightid=".$nightId." GROUP BY stackid ORDER BY desg+0,desg");
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    array_push($data['stacks'], $row);
}

echo(json_encode($data));
?>
