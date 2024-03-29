<?php
header('Cache-Control:no-cache');
header('Content-type: application/json');

include 'env.php';

# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);

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
        'SELECT * FROM ztf_found WHERE nightid=:nightid' .
        ' ORDER BY desg+0,desg'
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
            $row['desg'],
            str_replace(' ', '&nbsp;', 
                        str_replace('-', '&#8209;', 
                                    substr($row['obsdate'], 0, 16))),
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

    $statement = $db->prepare(
        'SELECT stackfile, desg, filtercode,
           ROUND(MAX(maglimit),1) AS maglimit,
           ROUND(AVG(rh),3) AS rh, ROUND(AVG(tmtp),2) AS tmtp,
           AVG(ra) AS ra, AVG(dec) AS dec, ROUND(AVG(vmag),1) AS vmag,
	   ROUND(AVG(sangle),0) as sangle, ROUND(AVG(ostat),1) AS ostat
         FROM ztf_found
         LEFT JOIN ztf_stacks USING (stackid)
         WHERE nightid=:nightid
           AND stackfile NOT NULL
         GROUP BY stackid ORDER BY vmag - ABS(COALESCE(ostat, 0))'
    );
    $statement->bindValue(':nightid', $nightId, SQLITE3_INTEGER);
    $result = $statement->execute();
    if ($result = $statement->execute()) {
        while ($row = $result->fetchArray()) {
            array_push($data['stacks'], array(
                "stackfile" => $row['stackfile'],
                "desg" => $row['desg'],
                "filter" => $row['filtercode'],
                "maglim" => $row['maglimit'],
                "rh" => $row['rh'],
                "tmtp" => $row['tmtp'],
                "sangle" => $row['sangle'],
                "ra" => $row['ra'],
                "dec" => $row['dec'],
		"vmag" => $row['vmag'],
		"ostat" => $row['ostat']
            ));
        }
    }
}
echo(json_encode($data));
?>
