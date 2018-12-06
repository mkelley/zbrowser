<?php
# query fields
#   target
parse_str($_SERVER['QUERY_STRING'], $query);
$db = new SQLite3('zchecker.db');

header('Cache-Control:no-cache');

$target = $query['target'];

$targets = array();
$result = $db->query('SELECT desg FROM obj');
while ($row = $result->fetchArray(SQLITE3_NUM)) {
    array_push($targets, $row[0]);
}

$data = array();

if (in_array($target, $targets)) {
    $objid = $db->querySingle('SELECT objid FROM obj WHERE desg="'.$target.'"');
    
    $data['valid'] = true;
    $data['target'] = $target;
    $data['objid'] = $objid;
    
    $data['table'] = array();
    $result = $db->query('SELECT desg,obsdate,ra,dec,dra,ddec,ra3sig,dec3sig,vmag,rh,rdot,delta,phase,trueanomaly,tmtp,filtercode,filefracday,field,ccdid,qid FROM ztf_found INNER JOIN obj USING (objid) WHERE objid='.$objid.' ORDER BY obsdate DESC');
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
    $result = $db->query("SELECT stackfile,filtercode,ROUND(MAX(maglimit),1),ROUND(AVG(rh),3) FROM ztf_stacks INNER JOIN ztf_cutouts USING (stackid) INNER JOIN ztf_found USING (foundid) WHERE objid=".$objid." GROUP BY stackid");
    while ($row = $result->fetchArray(SQLITE3_NUM)) {
        array_push($data['stacks'], $row);
    }
} else {
    $data['valid'] = false;
}

echo(json_encode($data));
?>
