import os
import argparse
import numpy as np
import matplotlib
matplotlib.use('agg')
import matplotlib.pyplot as plt
from astropy.time import Time
import astropy.units as u
from zchecker import ZChecker
from sbsearch.util import fov2points

parser = argparse.ArgumentParser(
    description='Plot ZTF pointing and found targets.')
parser.add_argument('destination', help='destination directory')
parser.add_argument('--date', help='night to plot, YYYY-MM-DD, UT')
parser.add_argument('--frame', default='equatorial',
                    choices=['equatorial', 'ecliptic', 'galactic'])
args = parser.parse_args()


def rows2lonlat(rows, frame, fov=False):
    from astropy.coordinates import Angle, SkyCoord

    if len(rows) == 0:
        return [], []
    else:
        if fov:
            ra, dec = np.array([fov2points(fov)[:2] for fov in rows]).T
        else:
            ra, dec = np.array([list(row) for row in rows]).T

    c = SkyCoord(ra=ra, dec=dec, unit='deg')
    if frame == 'equatorial':
        lon = c.ra
        lat = c.dec
    elif frame == 'ecliptic':
        c = c.geocentrictrueecliptic
        lon = c.lon
        lat = c.lat
    elif frame == 'galactic':
        c = c.galactic
        lon = c.l
        lat = c.b

    return lon.wrap_at(180 * u.deg).radian, lat.radian


with ZChecker() as z:
    if args.date is None:
        date = z.db.execute(
            'SELECT date FROM ztf_nights ORDER BY date DESC LIMIT 1'
        ).fetchone()[0]
        t = Time(date)
    else:
        t = Time(args.date)
        date = t.iso[:10]

    jd = t.jd

    rows = z.db.execute('''
    SELECT fov FROM ztf
    INNER JOIN obs USING (obsid)
    INNER JOIN ztf_nights USING(nightid)
    WHERE date=?
    GROUP BY expid
    ''', [date]).fetchall()

    exp = rows2lonlat(rows, args.frame, fov=True)

    rows = z.db.execute('''
    SELECT ra,dec FROM ztf_found
    INNER JOIN ztf_nights USING(nightid)
    WHERE date=?
    ''', [date]).fetchall()

    found = rows2lonlat(rows, args.frame)

    rows = z.db.execute('''
    SELECT AVG(ra),AVG(dec) FROM eph
    WHERE CAST(ROUND(jd, 0) as INTEGER)=?
      AND vmag < 23
    GROUP BY objid
    ''', [int(round(jd))]).fetchall()

    targets = rows2lonlat(rows, args.frame)

fig = plt.figure(1)
fig.clear()
ax = plt.subplot(111, projection='aitoff')

title = {
    'equatorial': "RA, Dec\n{}",
    'ecliptic': "λ, β\n{}",
    'galactic': "l, b\n{}",
}
plt.title(title[args.frame].format(date))

plt.grid(True)

ax.scatter(*exp, marker='.', color='none', edgecolors='k',
           linewidths=0.3, label='Exposures')
ax.scatter(*targets, s=1, marker='.', color='0.5',
           label='Targets (V<22 mag)')
ax.scatter(*found, marker='x', color='r', linewidths=0.3,
           label='Found targets')
fig.legend(*ax.get_legend_handles_labels())

frame_abbrv = {
    'equatorial': "eq",
    'ecliptic': "ec",
    'galactic': "gal"
}
fn = '{}-{}.png'.format(date, frame_abbrv[args.frame])
fn = os.path.join(args.destination, fn)

plt.savefig(fn, dpi=200)
