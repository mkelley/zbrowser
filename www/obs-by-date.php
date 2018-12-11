<?php
header('Cache-Control:no-cache');

# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);
$db = new SQLite3('/n/oort1/ZTF/zbrowser.db', SQLITE3_OPEN_READONLY);

$data = array();
$data['valid'] = false;

if (isset($query['date'])) {
    if (preg_match('/20[12][0-9]-[01][0-9]-[0123][0-9]/',
                   $query['date'], $matches)) {
        $date = $matches[0];
    } else {
        $date = false;
    }
} else {
    $d = new DateTime("now", new DateTimeZone("UTC"));
    $date = $d->format('Y-m-d');
}

if ($date) {
    $data['date'] = $date;

    $statement = $db->prepare(
        'SELECT nightid FROM ztf_nights WHERE date=:date'
    );
    $statement->bindValue(':date', $date, SQLITE3_TEXT);
    if ($result = $statement->execute()) {
        $row = $result->fetchArray();
        $nightId = $row[0];
    } else {
        $nightId = false;
    }
}

if ($nightId) {
    $data['valid'] = true;
    $data['table'] = array();
    $data['stacks'] = array();

    $statement = $db->prepare(
        'SELECT * FROM ztf_found WHERE nightid=:nightid ORDER BY desg+0,desg'
    );
    $statement->bindValue(':nightid', $nightId, SQLITE3_INTEGER);
    $result = $statement->execute();

    while($row = $result->fetchArray()) {
        $rh = $row['rh'];
        if ($row['rdot'] < 0) {
            $rh = -1 * $rh;
        }

        $url = sprintf(
            'https://irsa.ipac.caltech.edu/ibe/data/ztf/products/sci/%s/%s/%s/'
            .'ztf_%s_%06d_%s_c%02d_o_q%1d_',
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
            str_replace(' ', '&nbsp;', 
                        str_replace('-', '&#8209;', 
                                    substr($row['obsdate'], 0, 16))),
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

    $statement = $db->prepare(
        'SELECT stackfile,desg,filtercode,
           ROUND(MAX(maglimit),1),ROUND(AVG(rh),3)
         FROM ztf_found
         LEFT JOIN ztf_stacks USING (stackid)
         WHERE nightid=:nightid
         GROUP BY stackid ORDER BY desg+0,desg'
    );
    $statement->bindValue(':nightid', $nightId, SQLITE3_INTEGER);
    $result = $statement->execute();
    while ($row = $result->fetchArray(SQLITE3_NUM)) {
        array_push($data['stacks'], $row);
    }
}
echo(json_encode($data));
?>
