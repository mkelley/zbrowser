import matplotlib
matplotlib.use('agg')
import numpy as np

########################################################################


def stacks_by_date(z, date):
    rows = z.db.iterate_over('''
    SELECT stackfile FROM ztf_stacks
    LEFT JOIN ztf_cutouts USING (stackid)
    LEFT JOIN found USING (foundid)
    LEFT JOIN ztf USING (obsid)
    LEFT JOIN ztf_nights USING (nightid)
    WHERE date=?
      AND stackfile NOT NULL
    ''', [date])
    return rows

########################################################################


def stacks_by_desg(z, desg):
    rows = z.db.iterate_over('''
    SELECT DISTINCT stackfile FROM ztf_stacks
    LEFT JOIN ztf_cutouts USING (stackid)
    LEFT JOIN found USING (foundid)
    LEFT JOIN obj USING (objid)
    WHERE desg=?
      AND stackfile NOT NULL
    ''', [desg])
    return rows


def all_stacks(z):
    return z.db.iterate_over('''
    SELECT stackfile,stackdate FROM ztf_stacks
    WHERE stackfile NOT NULL
    ''', [])

########################################################################


def plot(inf, outf):
    import matplotlib as mpl
    import matplotlib.pyplot as plt
    from astropy.io import fits
    from astropy.stats import sigma_clipped_stats

    fig = plt.figure(1, (6, 4))
    fig.clear()
    axes = [fig.add_subplot(gs) for gs in
            plt.GridSpec(2, 3, wspace=0, hspace=0, left=0, right=1,
                         bottom=0, top=1)]

    cmap = mpl.cm.get_cmap('viridis')
    cmap.set_bad('k')

    with fits.open(inf) as hdu:
        # remove after all stacks have been updated to zchecker v2.4.8
        if 'NIGHTLY' in hdu:
            nightly = 'NIGHTLY'
        else:
            nightly = 'COMA'
            
        im = hdu[nightly].data
        blank = im * np.nan

        try:
            ref = hdu['COMA REF'].data
            ref -= sigma_clipped_stats(ref)[1]
        except KeyError:
            ref = blank

        try:
            baseline = hdu['COMA BL'].data
            diff = im - baseline
            mms = sigma_clipped_stats(diff)
        except KeyError:
            baseline = blank
            diff = blank
            mms = sigma_clipped_stats(im)

        try:
            ref_baseline = hdu['COMA REF BL'].data
            ref_baseline -= sigma_clipped_stats(ref_baseline)[1]
            ref_diff = ref - ref_baseline
        except KeyError:
            ref_baseline = blank
            ref_diff = blank

        opts = dict(cmap=cmap, vmin=-2 * mms[2], vmax=10 * mms[2], origin='lower')
        axes[0].imshow(im, **opts)
        axes[1].imshow(baseline, **opts)
        axes[2].imshow(diff, **opts)
        axes[3].imshow(ref, **opts)
        axes[4].imshow(ref_baseline, **opts)
        axes[5].imshow(ref_diff, **opts)

        shape = np.array(im.shape)
        for i in [0, 1, 3, 4]:
            x = np.array((0.4, 0.45, 0.55, 0.6)) * shape[1]
            axes[i].plot(x[:2], x[:2], color='0.75')
            axes[i].plot(x[:2][::-1], x[2:], color='0.75')
            axes[i].plot(x[2:], x[2:], color='0.75')
            axes[i].plot(x[2:][::-1], x[:2], color='0.75')

    plt.setp(axes, frame_on=False, xticks=[], yticks=[])
    fig.savefig(outf, dpi=200)
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
    parser.add_argument(
        'destination',
        help='destination directory')
    parser.add_argument(
        '--desg',
        help='plot all images for these targets')
    parser.add_argument(
        '--date', type=Date, default=today,
        help='plot all images for this date, YYYY-MM-DD, default is today')
    parser.add_argument(
        '--force', '-f', action='store_true',
        help='force overwrite')
    parser.add_argument(
        '--full-update', action='store_true',
        help='update missing and out-of-date plots; with -f, update all plots')
    parser.add_argument(
        '--db',
        help='database file')
    parser.add_argument(
        '--path',
        help='local cutout path (if different from zchecker config)')
    parser.add_argument(
        '--config', default=os.path.expanduser('~/.config/zchecker.config'),
        help='configuration file')
    parser.add_argument(
        '-v', action='store_true',
        help='increase verbosity')

    args = parser.parse_args()

    config = Config.from_args(args)
    with ZChecker(config) as z:
        path = z.config['stack path']
        if args.desg is not None:
            stacks = [stacks_by_desg(z, desg)
                      for desg in args.desg.split(',')]
        elif args.full_update:
            stacks = [all_stacks(z)]
        else:
            stacks = [stacks_by_date(z, args.date)]

        count = 0
        for i in range(len(stacks)):
            for row in stacks[i]:
                stack = row[0]
                inf = os.path.join(path, stack)
                basename = stack.replace('.fits', '.png')
                outf = os.path.join(args.destination, basename)
                try:
                    check_path(outf)
                except FileExistsError:
                    if args.force:
                        pass
                    elif args.full_update:
                        stack_time = str(row[1])
                        plot_time = datetime.utcfromtimestamp(
                            os.path.getmtime(outf)).isoformat(' ')
                        if plot_time > stack_time:
                            continue
                        print(plot_time, stack_time)
                    else:
                        z.logger.debug('{} already exists'.format(basename))
                        continue

                plot(inf, outf)
                count += 1
                z.logger.debug('{}'.format(basename))

    z.logger.debug('{} stacks updated.'.format(count))
