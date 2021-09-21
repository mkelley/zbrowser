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
    $data['stacks'] = array();

    $statement = $db->prepare(
        'SELECT * FROM ztf_found WHERE objid=:objid ORDER BY obsdate DESC'
    );
    $statement->bindValue(':objid', $objid, SQLITE3_INTEGER);

    if ($result = $statement->execute()) {
        while($row = $result->fetchArray()) {
            $foundid = $row['foundid'];

            $rh = $row['rh'];
            if ($row['rdot'] < 0) {
                $rh = -1 * $rh;
            }
            $url = sprintf(
                'https://irsa.ipac.caltech.edu/ibe/data/ztf/products/sci/'
                .'%s/%s/%s/ztf_%s_%06d_%s_c%02d_o_q%1d_',
                substr($row['filefracday'], 0, 4),
                substr($row['filefracday'], 4, 4),
                substr($row['filefracday'], 8),
                $row['filefracday'],
                $row['field'],
                $row['filtercode'],
                $row['ccdid'],
                $row['qid']);

            if (is_null($row['m'])) {
                $m = array();
                $merr = array();
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
                str_replace(' ', '&nbsp;', substr($row['obsdate'], 0, 16)),
#                            str_replace('-', '&#8209;',
                $row['programid'],
                $row['ra'],
                $row['dec'],
                round(hypot($row['dra'], $row['ddec']), 2),
                round($rh, 3),
                round($row['delta'], 3),
                round($row['phase'], 1),
                round($row['tmtp'], 2),
                '<a href="' . $url . 'sciimg.fits">sci</a> <a href="'
                . $url . 'scimrefdiffimg.fits.fz">diff</a>',
                round(hypot($row['ra3sig'], $row['dec3sig']), 2),
                round(hypot($row['dx'], $row['dy']), 2),
                round($row['vmag'], 2),
                $row['filtercode'],
                $m,
                $merr,
                $row['flag'],
                $row['ostat']
            ));
        }
    }

    $statement = $db->prepare(
        'SELECT stackfile,SUBSTR(obsdate,0,11) AS obsdate,
           filtercode,ROUND(MAX(maglimit),1) AS maglimit,
           ROUND(AVG(rh),3) AS rh,ROUND(AVG(tmtp),2) AS tmtp,
           ROUND(AVG(rh)) AS rh,AVG(ra) AS ra,AVG(dec) AS dec
         FROM ztf_found
         LEFT JOIN ztf_stacks USING (stackid)
         WHERE objid=:objid
           AND stackfile NOT NULL
         GROUP BY stackid
         ORDER BY obsdate DESC'
    );
    $statement->bindValue(':objid', $objid, SQLITE3_INTEGER);
    if ($result = $statement->execute()) {
        while ($row = $result->fetchArray()) {
            array_push($data['stacks'], array(
                "stackfile" => $row['stackfile'],
                "date" => $row['obsdate'],
                "filter" => $row['filtercode'],
                "maglim" => $row['maglimit'],
                "rh" => $row['rh'],
                "tmtp" => $row['tmtp'],
                "sangle" => $row['sangle'],
                "ra" => $row['ra'],
                "dec" => $row['dec']
            ));
        }
    }
}

echo(json_encode($data));
?>
