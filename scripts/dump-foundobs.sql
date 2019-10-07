.open /oort1/ZTF/zchecker.db
ATTACH DATABASE '/oort1/ZTF/new_zbrowser.db' AS zb;
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
       sangle FLOAT,
       trueanomaly FLOAT,
       tmtp FLOAT,
       infobits INTEGER,
       filtercode TEXT,
       filefracday INTEGER,
       field INTEGER,
       ccdid INTEGER,
       qid INTEGER,
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
       flag INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS zb.ztf_found_objid_obsid ON ztf_found(obsid,objid);
INSERT OR IGNORE INTO zb.ztf_found
SELECT foundid,objid,obsid,desg,nightid,obsdate,ra,dec,dra,ddec,ra3sig,dec3sig,
  vmag,rh,rdot,delta,phase,sangle,trueanomaly,tmtp,infobits,filtercode,filefracday,field,
  ccdid,qid,maglimit,programid,stackid,dx,dy,bgap,bg,bg_area,bg_stdev,flux,m,merr,flag
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
       nobs INTEGER,
       nnights INTEGER,
       last_night TEXT,
       last_vmag FLOAT,
       last_phot TEXT,
       last_rh FLOAT,
       last_m FLOAT,
       last_merr FLOAT,
       ng INTEGER,
       nr INTEGER,
       ni INTEGER
);
INSERT OR REPLACE INTO zb.obj_summary
SELECT objid,desg,nobs,nnights,SUBSTR(last_cov,1,10),last_vmag,SUBSTR(last_phot,1,10),
       last_rh,last_m,last_merr,ng,nr,ni
FROM zb.ztf_found
JOIN (
     SELECT t1.objid,last_cov,vmag AS last_vmag,nobs,nnights
     FROM zb.ztf_found t1
     JOIN (
     	  SELECT objid,MAX(obsdate) AS last_cov,COUNT() AS nobs,COUNT(DISTINCT nightid) AS nnights
	  FROM ztf_found GROUP BY objid) t2
     ON t1.objid = t2.objid AND t1.obsdate = t2.last_cov
) USING (objid)
JOIN (
     SELECT t3.objid,last_phot,t3.rh AS last_rh,t3.m AS last_m,t3.merr AS last_merr,ng,nr,ni
     FROM zb.ztf_found t3
     JOIN (
     	  SELECT objid,MAX(obsdate) AS last_phot,
		 SUM(filtercode = 'zg') AS ng,
		 SUM(filtercode = 'zr') AS nr,
		 SUM(filtercode = 'zi') AS ni
	  FROM zb.ztf_found WHERE m NOT NULL GROUP BY objid) t4
     ON t3.objid = t4.objid AND t3.obsdate = t4.last_phot
) USING (objid)
GROUP BY objid;

CREATE TABLE IF NOT EXISTS zb.ztf_stacks(
       stackid INTEGER PRIMARY KEY,
       stackfile TEXT
);
INSERT OR IGNORE INTO zb.ztf_stacks SELECT stackid,stackfile FROM ztf_stacks;
