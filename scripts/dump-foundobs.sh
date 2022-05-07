#!/bin/bash
# usage: dump-foundobs.sh zchecker.db new.db

if [[ -z "$1" || -z "$2" ]]
then
  echo "Usage: dump-foundobs.sh zchecker.db new.db";
  exit 1;
fi

sqlite3 $1 <<EOF
ATTACH DATABASE "${2}" AS zb;
CREATE TABLE IF NOT EXISTS zb.ztf_found(
       foundid INTEGER PRIMARY KEY,
       objid INTEGER KEY,
       obsid INTEGER KEY,
       pid INTEGER,
       desg TEXT,
       nightid INTEGER KEY,
       obsdate TEXT,
       obsjd FLOAT,
       ra FLOAT,
       dec FLOAT,
       dra FLOAT,
       ddec FLOAT,
       ra3sig FLOAT,
       dec3sig FLOAT,
       vmag FLOAT,
       rh FLOAT,
       rdot FLOAT,
       delta FLOAT,
       phase FLOAT,
       sangle FLOAT,
       trueanomaly FLOAT,
       tmtp FLOAT,
       infobits INTEGER,
       filtercode TEXT,
       filefracday INTEGER,
       field INTEGER,
       ccdid INTEGER,
       qid INTEGER,
       airmass FLOAT,
       seeing FLOAT,
       maglimit FLOAT,
       programid INTEGER,
       stackid INTEGER KEY,
       dx FLOAT,
       dy FLOAT,
       bgap INTEGER,
       bg FLOAT,
       bg_area INTEGER,
       bg_stdev FLOAT,
       flux BLOB,
       m BLOB,
       merr BLOB,
       flag INTEGER,
       m5 FLOAT,
       ostat FLOAT,
       archivefile TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS zb.ztf_found_objid_obsid ON ztf_found(obsid,objid);
INSERT OR IGNORE INTO zb.ztf_found
SELECT foundid,objid,obsid,pid,desg,nightid,obsdate,obsjd,ra,dec,dra,ddec,ra3sig,dec3sig,
  vmag,rh,rdot,delta,phase,sangle,trueanomaly,tmtp,infobits,filtercode,filefracday,field,
  ccdid,qid,airmass,seeing,maglimit,programid,stackid,dx,dy,bgap,bg,bg_area,bg_stdev,flux,
  m,merr,flag,m5,ostat,archivefile
FROM ztf_found
LEFT JOIN ztf_cutouts USING (foundid)
LEFT JOIN obj USING (objid)
LEFT JOIN ztf_stacks USING (stackid)
LEFT JOIN ztf_phot USING (foundid);


CREATE TABLE IF NOT EXISTS zb.obj(objid INTEGER PRIMARY KEY, desg);
INSERT OR IGNORE INTO zb.obj SELECT objid,desg FROM obj;

CREATE TABLE IF NOT EXISTS zb.ztf_nights(
  nightid INTEGER PRIMARY KEY,
  date TEXT,
  exposures INTEGER,
  quads INTEGER
);
INSERT OR IGNORE INTO zb.ztf_nights
SELECT nightid,date,exposures,quads FROM ztf_nights;

CREATE TABLE IF NOT EXISTS zb.obj_summary(
       objid INTEGER PRIMARY KEY,
       desg TEXT,
       first_ephemeris_update TEXT,
       last_ephemeris_update TEXT,
       nnights INTEGER,
       first_night_covered TEXT,
       last_night_covered TEXT,
       nobs INTEGER,
       first_night_detected TEXT,
       last_night_detected TEXT,
       ndet INTEGER,
       ng INTEGER,
       nr INTEGER,
       ni INTEGER
);

CREATE TEMPORARY TABLE ephemeris_update AS
SELECT objid,
       MIN(retrieved) as first,
       MAX(retrieved) as last
FROM eph GROUP BY objid;

INSERT OR REPLACE INTO zb.obj_summary
SELECT zf.objid,
       desg,
       temp.ephemeris_update.first,
       temp.ephemeris_update.last,
       COUNT(DISTINCT nightid) as nnights,
       SUBSTR(MIN(obsdate),1,10) AS first_night_covered,
       SUBSTR(MAX(obsdate),1,10) AS last_night_covered,
       COUNT() AS nobs,
       SUBSTR(MIN(IIF(m5 < maglimit,obsdate,NULL)),1,10) AS first_night_detected,
       SUBSTR(MAX(IIF(m5 < maglimit,obsdate,NULL)),1,10) AS last_night_detected,
       SUM(m5 < maglimit) AS ndet,
       SUM(filtercode = 'zg' AND m5 < maglimit) AS ng,
       SUM(filtercode = 'zr' AND m5 < maglimit) AS nr,
       SUM(filtercode = 'zi' AND m5 < maglimit) AS ni
FROM zb.ztf_found AS zf
JOIN temp.ephemeris_update USING (objid)
GROUP BY objid;

CREATE TABLE IF NOT EXISTS zb.ztf_stacks(
       stackid INTEGER PRIMARY KEY,
       stackfile TEXT
);
INSERT OR IGNORE INTO zb.ztf_stacks SELECT stackid,stackfile FROM ztf_stacks;
EOF

