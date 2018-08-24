.open zchecker.db
.mode csv
.once /tmp/foundobs.csv
SELECT foundid,desg,obsjd,ra,dec,dra,ddec,ra3sig,dec3sig,vmag,rh,rdot,delta,phase,selong,sangle,vangle,trueanomaly,tmtp,pid,x,y,retrieved,nightid,infobits,field,ccdid,qid,rcid,fid,filtercode,expid,obsdate,filefracday,seeing,airmass,moonillf,maglimit FROM foundobs;
.once /tmp/nights.csv
SELECT * FROM nights;
.once /tmp/stacks.csv
SELECT * FROM stacks;
.open /tmp/foundobs.db
DROP TABLE stacks;
DROP TABLE nights;
DROP TABLE foundobs;
CREATE TABLE foundobs(
    foundid INTEGER PRIMARY KEY,
    desg TEXT,
    obsjd TEXT,
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
    selong FLOAT,
    sangle FLOAT,
    vangle FLOAT,
    trueanomaly FLOAT,
    tmtp FLOAT,
    pid INTEGER,
    x INTEGER,
    y INTEGER,
    retrieved TEXT,
    nightid INTEGER,
    infobits INTEGER,
    field INTEGER,
    ccdid INTEGER,
    qid INTEGER,
    rcid INTEGER,
    fid INTEGER,
    filtercode TEXT,
    expid INTEGER,
    obsdate TEXT,
    filefracday INTEGER,
    seeing FLOAT,
    airmass FLOAT,
    moonillf FLOAT,
    maglimit FLOAT);
.mode csv
.import /tmp/foundobs.csv foundobs
CREATE TABLE nights(
    nightid INTEGER PRIMARY KEY,
    date TEXT UNIQUE,
    nframes INTEGER
);
.import /tmp/nights.csv nights
CREATE TABLE stacks(
    foundid INTEGER,
    stackfile TEXT,
    stacked INTEGER,
    FOREIGN KEY(foundid) REFERENCES foundobs(foundid)
);
.import /tmp/stacks.csv stacks
