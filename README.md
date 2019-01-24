Requires: matplotlib, astropy, zchecker, sqlite3, php with sqlite3 support

Setup
-----

1. Create directory structure for website.
   * site/
     * img/
       * lightcurves/
       * pointing/
       * stacks/
2. Copy www/* to site/ directory.
3. Copy scripts/dump-foundobs.sql to your favorite location.  Edit the first two lines to use the correct paths.
4. Edit zbrowser/www/targets.php, zbrowser/www/status.php and zbrowser/www/obs-by-date.php to point to the correct path of zbrowser.db.

Daily
-----

After zchecker, zproject, zstack, and zphot:
```
export ZBSR=/path/to/zbrowser
export ZDATA=/path/to/zchecker/output
export ZWEB=/path/to/web/site
(cd $ZDATA; sqlite3 < /path/to/dump-foundobs.sql)
python3 ${ZBSR}/scripts/pointing.py --frame=equatorial ${ZWEB}/img/pointing
python3 ${ZBSR}/scripts/pointing.py --frame=ecliptic ${ZWEB}/img/pointing
python3 ${ZBSR}/scripts/pointing.py --frame=galactic ${ZWEB}/img/pointing
python3 ${ZBSR}/scripts/stack2web.py ${ZWEB}/img/stacks
```

Occasionally
------------

The default stack2web.py behavior is to check for stacks in the last
night of data.  When other nights need to be stacked or images need to
be replotted:

```
export ZWEB=/path/to/web/site
export ZBSR=/path/to/zbrowser

# replot missing images for one target:
python3 ${ZBSR}/scripts/stack2web.py --desg='C/2016 R2' ${ZWEB}/img/stacks

# replot all images for one target:
python3 ${ZBSR}/scripts/stack2web.py --desg='C/2016 R2' -f ${ZWEB}/img/stacks

# similarly for one date:
python3 ${ZBSR}/scripts/stack2web.py --date=2018-08-23 ${ZWEB}/img/stacks
python3 ${ZBSR}/scripts/stack2web.py --date=2018-08-23 -f ${ZWEB}/img/stacks

# or, for all dates all targets:
python3 ${ZBSR}/scripts/stack2web.py --full-update ${ZWEB}/img/stacks

# force update all images:
python3 ${ZBSR}/scripts/stack2web.py --full-update -f ${ZWEB}/img/stacks
```
