import matplotlib
matplotlib.use('agg')
import numpy as np

########################################################################


def stacks_by_date(z, date):
    rows = z.fetch_iter('''
    SELECT DISTINCT stackfile FROM stacks
    INNER JOIN foundobs ON stacks.foundid=foundobs.foundid
    INNER JOIN nights ON foundobs.nightid=nights.nightid
    WHERE date=?
      AND stacked > 0
    ''', [date])
    return rows

########################################################################


def stacks_by_desg(z, desg):
    rows = z.fetch_iter('''
    SELECT DISTINCT stackfile FROM stacks
    INNER JOIN foundobs ON stacks.foundid=foundobs.foundid
    WHERE desg=?
      AND stacked > 0
    ''', [desg])
    return rows


def all_stacks(z, force_update):
    rows = z.fetch_iter('''
    SELECT stackfile,max(sci_sync_date) FROM stacks
    INNER JOIN foundobs ON stacks.foundid=foundobs.foundid
    WHERE stacked > 0
    GROUP BY stackfile
    ''')
    return rows

########################################################################


def plot(inf, outf):
    import matplotlib as mpl
    import matplotlib.pyplot as plt
    from astropy.io import fits
    from astropy.stats import sigma_clipped_stats

    fig = plt.figure(1, (9, 3))
    fig.clear()
    axes = [fig.add_subplot(gs) for gs in
            plt.GridSpec(1, 3, wspace=0, hspace=0, left=0, right=1,
                         bottom=0, top=1)]

    cmap = mpl.cm.get_cmap('viridis')
    cmap.set_bad('k')

    with fits.open(inf) as hdu:
        if 'coma-baseline' in hdu:
            k = 'coma-baseline'
            baselined = hdu[k].data
        else:
            k = 'coma scaled'
            baselined = np.zeros_like(hdu[k].data)

        mms = sigma_clipped_stats(hdu[k].data)
        opts = dict(cmap=cmap, vmin=-2 * mms[2], vmax=5 * mms[2])
        axes[0].imshow(hdu['coma scaled'].data, **opts)
        axes[1].imshow(hdu['coma scaled'].data - baselined, **opts)
        axes[2].imshow(baselined, **opts)

        shape = np.array(hdu['coma scaled'].data.shape)
        for i in range(2):
            x = np.array((0.4, 0.45, 0.55, 0.6)) * shape[1]
            axes[i].plot(x[:2], x[:2], color='0.75')
            axes[i].plot(x[:2][::-1], x[2:], color='0.75')
            axes[i].plot(x[2:], x[2:], color='0.75')
            axes[i].plot(x[2:][::-1], x[:2], color='0.75')

    plt.setp(axes, frame_on=False, xticks=[], yticks=[])
    fig.savefig(outf, dpi=300 / 3)
    plt.close()

########################################################################


def check_path(fn):
    import os
    d = os.path.split(fn)[0]
    if not os.path.exists(d):
        os.mkdir(d)
    if os.path.exists(fn):
        raise FileExistsError

########################################################################


def Date(date):
    import re
    if re.match('^[0-9]{,4}-[01][0-9]-[0-3][0-9]$', date) is None:
        raise ValueError('--date must have the format YYYY-MM-DD')
    return date


if __name__ == '__main__':
    import os
    import argparse
    from datetime import datetime
    from zchecker import ZChecker, Config

    today = datetime.utcnow().strftime('%Y-%m-%d')

    parser = argparse.ArgumentParser(
        description='Convert ZChecker stacks to plots for the web.')
    parser.add_argument('destination', help='destination directory')
    parser.add_argument('--desg', help='plot all images for these targets')
    parser.add_argument('--date', type=Date, default=today,
                        help='plot all images for this date, YYYY-MM-DD, default is today')
    parser.add_argument('-f', action='store_true', help='force overwrite')
    parser.add_argument('--full-update', action='store_true',
                        help='update missing and out-of-date plots; with -f, update all plots')
    parser.add_argument('--db', help='database file')
    parser.add_argument('--path',
                        help='local cutout path (if different from zchecker config)')
    parser.add_argument('--config', default=os.path.expanduser(
        '~/.config/zchecker.config'),
        help='configuration file')
    parser.add_argument('-v', action='store_true', help='increase verbosity')

    args = parser.parse_args()

    config = Config.from_args(args)
    with ZChecker(config) as z:
        path = z.config['stack path']
        if args.desg is not None:
            stacks = [stacks_by_desg(z, desg) for desg in args.desg.split(',')]
        elif args.full_update:
            stacks = [all_stacks(z, args.f)]
        else:
            stacks = [stacks_by_date(z, args.date)]

        for i in range(len(stacks)):
            for row in stacks[i]:
                stack = row[0]
                inf = os.path.join(path, stack)
                basename = stack.replace('.fits.gz', '.png')
                outf = os.path.join(args.destination, basename)
                try:
                    check_path(outf)
                except FileExistsError:
                    if args.f:
                        pass
                    elif args.full_update:
                        stack_time = str(row[1])
                        plot_time = datetime.fromtimestamp(
                            os.path.getmtime(outf)).isoformat().replace('T', ' ')
                        if plot_time > stack_time:
                            continue
                    else:
                        z.logger.debug('{} already exists'.format(basename))
                        continue

                plot(inf, outf)
                z.logger.info('{}'.format(basename))
