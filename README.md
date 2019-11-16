Requires: matplotlib, astropy, zchecker, sqlite3, php with sqlite3 support

Setup
-----

1. Create directory structure for website.

   `mkdir -p site/img/{pointing,stacks}`

   * site/
     * img/
       * pointing/
       * stacks/

2. Copy zbrower/www/* to site/ directory.
3. Move site/env-template.php to site/env.php.  Edit env.php to use the correct values.

Daily
-----

After zchecker, zproject, zstack, and zphot:
```
source zchecker.env
${ZBROWSER_SCRIPTS}/dump-foundobs.sh ${ZDATA}/zchecker.db ${ZDATA}/new_zbrowser.db && \
mv ${ZDATA}/{new_zbrowser,zbrowser}.db
python3 ${ZBROWSER_SCRIPTS}/scripts/pointing.py --frame=equatorial ${ZWEB}/img/pointing
python3 ${ZBROWSER_SCRIPTS}/scripts/pointing.py --frame=ecliptic ${ZWEB}/img/pointing
python3 ${ZBROWSER_SCRIPTS}/scripts/pointing.py --frame=galactic ${ZWEB}/img/pointing
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py ${ZWEB}/img/stacks
```

Occasionally
------------

The default stack2web.py behavior is to check for stacks in the last
night of data.  When other nights need to be stacked or images need to
be replotted:

```
source zchecker.env

# replot missing images for one target:
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --desg='C/2016 R2' ${ZWEB}/img/stacks

# replot all images for one target:
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --desg='C/2016 R2' -f ${ZWEB}/img/stacks

# similarly for one date:
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --date=2018-08-23 ${ZWEB}/img/stacks
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --date=2018-08-23 -f ${ZWEB}/img/stacks

# or, for all dates all targets:
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --full-update ${ZWEB}/img/stacks

# force update all images:
python3 ${ZBROWSER_SCRIPTS}/scripts/stack2web.py --full-update -f ${ZWEB}/img/stacks
```
