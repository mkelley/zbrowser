.open /oort1/ZTF/zchecker.db
ATTACH DATABASE '/oort1/ZTF/zbrowser.db' AS zb;
CREATE TABLE IF NOT EXISTS zb.ztf_found(
       foundid INTEGER PRIMARY KEY,
       objid INTEGER KEY,
       obsid INTEGER KEY,
       desg TEXT,
       nightid INTEGER KEY,
       obsdate TEXT,
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
       trueanomaly FLOAT,
       tmtp FLOAT,
       infobits INTEGER,
       filtercode TEXT,
       filefracday INTEGER,
       field INTEGER,
       ccdid INTEGER,
       qid INTEGER,
       maglimit FLOAT,
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
       flag INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS zb.ztf_found_objid_obsid ON ztf_found(obsid,objid);
INSERT OR IGNORE INTO zb.ztf_found
SELECT foundid,objid,obsid,desg,nightid,obsdate,ra,dec,dra,ddec,ra3sig,dec3sig,
  vmag,rh,rdot,delta,phase,trueanomaly,tmtp,infobits,filtercode,filefracday,field,
  ccdid,qid,maglimit,stackid,dx,dy,bgap,bg,bg_area,bg_stdev,flux,m,merr,flag
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


CREATE TABLE IF NOT EXISTS zb.ztf_stacks(
       stackid INTEGER PRIMARY KEY,
       stackfile TEXT
);
INSERT OR IGNORE INTO zb.ztf_stacks SELECT stackid,stackfile FROM ztf_stacks;
