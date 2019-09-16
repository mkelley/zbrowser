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
    $data['stacks'] = array();

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
                str_replace(' ', '&nbsp;',
                            str_replace('-', '&#8209;',
                                        substr($row['obsdate'], 0, 16))),
                $row['ra'],
                $row['dec'],
                round(hypot($row['dra'], $row['ddec']), 2),
                round($rh, 3),
                round($row['delta'], 3),
                round($row['phase'], 1),
                round($row['tmtp'], 1),
                '<a href="' . $url . 'sciimg.fits">sci</a> <a href="'
                . $url . 'scimrefdiffimg.fits.fz">diff</a>',
                round(hypot($row['ra3sig'], $row['dec3sig']), 2),
                round(hypot($row['dx'], $row['dy']), 2),
                round($row['vmag'], 1),
                $row['filtercode'],
                $m,
                $merr,
                $row['flag']
            ));
        }
    }

    $statement = $db->prepare(
        'SELECT stackfile,filtercode,
           ROUND(MAX(maglimit),1),ROUND(AVG(rh),3),
           ROUND(AVG(tmtp), 2)
         FROM ztf_found
         LEFT JOIN ztf_stacks USING (stackid)
         WHERE objid=:objid
           AND stackfile NOT NULL
         GROUP BY stackid
         ORDER BY obsdate DESC'
    );
    $statement->bindValue(':objid', $objid, SQLITE3_INTEGER);
    if ($result = $statement->execute()) {
        while ($row = $result->fetchArray(SQLITE3_NUM)) {
            array_push($data['stacks'], $row);
        }
    }
}

echo(json_encode($data));
?>
