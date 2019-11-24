// Licensed under a 3-clause BSD style license - see LICENSE
'use strict';

function sexagesimal(x, seconds_precision, degrees_width) {
    /* 
       seconds_precision : integer
         decimals after the point, default 3.
       
       degrees_width : integer
         Zero pad the degrees place to this width.  The default is
         no padding.
    */
    if (seconds_precision === undefined) {
      seconds_precision = 3;
    }

    let sign = (x < 0)?'-':'+';
    let d = Math.floor(Math.abs(x));
    let m = Math.floor((Math.abs(x) - d) * 60);
    let s = ((Math.abs(x) - d) * 60 - m) * 60;

    let factor = Math.pow(10, seconds_precision);
    s = Math.round(s * factor) / factor;
    if (s >= 60) {
      s -= 60;
      m += 1;
    }
    
    if (m >= 60) {
      m -= 60;
      d += 1;
    }
    
    d = d.toFixed(0);
    m = m.toFixed(0);
    s = s.toFixed(seconds_precision);
    
    if (degrees_width === undefined) {
      d = sign + d;
    } else {
      d = sign + '0'.repeat(degrees_width - d.length) + d;
    }
    
    m = '0'.repeat(2 - m.length) + m;

    if (seconds_precision == 0) {
      s = '0'.repeat(2 - s.length) + s;
    } else {
      s = '0'.repeat(2 - s.length + seconds_precision + 1) + s;
    }

    return d + ':' + m + ':' + s;
}

function query(parameter, search) {
  let valid_queries = ['status', 'obs-by-target', 'obs-by-date',
		       'targets', 'phot-by-target', 'target-summary'];
  if (valid_queries.indexOf(parameter) === -1) {
    throw new Error('Bad internal query: ' + parameter);
  }

  let q = "";
  if (['obs-by-target', 'phot-by-target'].indexOf(parameter) !== -1) {
    q = "?target=" + encodeURIComponent(search);
  } else if (['obs-by-date'].indexOf(parameter) !== -1) {
    q = "?date=" + encodeURIComponent(search);
  }

  return new Promise(function(resolve, reject) {
    let request = new XMLHttpRequest();
    let url = parameter + '.php' + q;
    
    request.open('GET', url);
    request.responseType = 'json';
    request.onload = function() {
      if (request.status === 200) {
	resolve(request.response);
      } else {
	reject(Error('Data did not successfully load: '
		     + request.statusText));
      }
    };
    request.send();
  });
}

function setup() {
  return query('targets').then(
    function(targets) {
      let dataList = $('#targets')[0];
      $.each(targets, function(objid, desg) {
	let option = document.createElement('option');
	option.value = desg;
	option.dataset.objid = objid;
	dataList.appendChild(option);
      });
    }
  );
}

function imageCard(size, title, img) {
  return $('<div class="col-sm-12 col-lg-' + size + ' mx-auto">').append(
    $('<div class="card">').append(
      $('<h5 class="card-header">').append(title),
      $('<a href="' + img + '">').append(
	$('<img class="card-img-top" src="' + img + '">')
      )
    )
  );
}

function lightcurveCard(size, title, lc) {
  return $('<div class="col-sm-12 col-lg-' + size + '">').append(
    $('<div class="card">').append(
      $('<h5 class="card-header">').append(title), $(lc)
    )
  );
}

function stackCards(id, data) {
  let stacks = $(id);
  stacks.empty();

  for (var i = 0; i < data.length; i++) {
    let title = '';
    if ('desg' in data[i]) {
      title += badge_link(
	data[i]['desg'],
	'?obs-by-target=' + data[i]['desg'],
	'_self',
	'primary') + ' ';
    }
    if ('date' in data[i]) {
      title += badge(data[i]['date'], 'primary') + ' ';
    }
    title += badge(data[i]['filter']) + ' ';
    title += badge(data[i]['rh'] + ' au') + ' ';
    title += badge('T–Tp ' + data[i]['tmtp']) + ' ';
    title += badge('maglim ' + data[i]['maglim']) + ' ';
    title += badge('⊙ ' + data[i]['sangle'] + '°') + ' ';
    title += badge_link('PS1', 'http://ps1images.stsci.edu/' + 
      'cgi-bin/ps1cutouts?pos=' + data[i]['ra'] + '+' + data[i]['dec'] +
      '&filter=g&filter=r&filter=i&filetypes=stack&auxiliary=data&size=900&' +
      'output_size=0&verbose=0&autoscale=99.500000', '_blank', 'success');

    let img = 'img/stacks/' + data[i]['stackfile'].replace('.fits', '.png')
    stacks.append(imageCard(8, title, img));
  }
}

function badge(text, context = 'secondary') {
  let b = '<span class="badge badge-' + context + '" >' + text + '</span>';
  return b;
}

function badge_link(text, href, target = '_self', context = 'secondary') {
  let b = '<a href="' + href + '" target="' + target +
    '" class="badge badge-' + context + '" >' + text + '</a>';
  return b;
}

/* Return empty string for null values */
function formatNumber(value, fixed) {
  if (value === null)
    return '';
  else
    return Number(value).toFixed(fixed);
}

function newCarousel(id) {
  let carousel = $('<div id="carouselExampleControls" class="carousel slide col-sm-12 col-lg-8" style="margin-bottom: 5em;" data-ride="carousel"></div>');
  carousel.append($('<div class="carousel-inner"></div>'));

  let prev = $('<a class="carousel-control-prev" href="#carouselExampleControls" role="button" data-slide="prev"></a>');
  prev.append($('<span class="carousel-control-prev-icon" aria-hidden="true"></span>'));
  prev.append($('<span class="sr-only">Previous</span>'));
  carousel.append(prev);

  let next = $('<a class="carousel-control-next" href="#carouselExampleControls" role="button" data-slide="next" data-interval="false"></a>');
  next.append($('<span class="carousel-control-next-icon" aria-hidden="true"></span>'));
  next.append($('<span class="sr-only">Next</span>'));
  carousel.append(next);

  return carousel;
}

function addToCarousel(carousel, caption, img, active=false) {
  let inner = carousel.find('div.carousel-inner');
  let item = $(
    '<div class="carousel-item'
      + (active ? ' active' : '')
      + '"></div>');


  item.append($('<h5>' + caption + '</h5>'));
  item.append($('<img class="d-block w-100" src="' + img + '">'));
  
  inner.append(item);
}

/* Halley-Marcus phase function approximation.  phase in deg. */
function Phi(phase) {
  const p = [6.08574208e-13, -1.87340401e-10,  1.95993776e-08, 
	     -9.53710066e-07, 1.90128133e-04, -1.79339842e-02,
	     -1.47528434e-03];
  let y = 0;
  for (const v in p) {
    y += y * phase + v;
  }
  return y;
}

function median(x) {
  let y = x.sort();
  let mid = Math.floor(y.length / 2);
  return y.length % 2 !== 0 ? x[mid] : (x[mid - 1] + x[mid]) / 2;
}

function stdev(x) {
  let s;
  if (x.length == 1) {
    s = 0;
  } else {
    const m = median(x);
    s = Math.sqrt(x.reduce((sum, next) => sum + (next - m)**2)
		  / (x.length - 1));
  }
  return s;
}

/* Returns indices of good (unclipped) values */
function sigmaClip(a, sigma=2) {
  const m = median(a);
  const s = stdev(a);
  const d = a.map(y => (y - m) / s);
  const good = a.map(x => x <= sigma);
  return good;
}

function weightedMean(a, err) {
  const weights = err.map(x => x**-2);
  const wa = a.map((x, i) => x * weights[i]);
  const sw = weights.reduce((sum, next) => sum + next);
  const wm = a.reduce((sum, next) => sum + next) / sw;
  const we = Math.sqrt(1 / sw);
  return [wm, we];
}

function ostat(rh, delta, phase, m, merr) {
  if ((m === null) || (m === NaN) || (merr === NaN)) {
    return null;
  }
  
  // scale magnitudes by geometry to last value, then difference
  let dm = m.map(
    (x, i) => (
      x - 10 * Math.log10(rh[i]) - 5 * Math.log10(delta[i])
      + 2.5 * Math.log10(Phi(phase[i]))
  ));
  dm = dm.map(x => x - dm[dm.length - 1]);
  
  // reject outliers
  const good = sigmaClip(dm.slice(0, dm.length - 1), merr);
  const MFiltered = good.map((keep, i) => keep ? dm[i] : null)
    .filter(x => x !== null);
  const merrFiltered = good.map((keep, i) => keep ? merr[i] : null)
    .filter(x => x !== null);

  // calculate weighted mean
  const [mBaseline, mBaselineErr] = weightedMean(MFiltered, merrFiltered);
  
  // outburst statistic is change in brightness normalized by uncertainty
  const unc = Math.max(Math.sqrt(mBaselineErr**2 + merr[last]**2), 0.1);
  return mBaseline / unc;
}

function status(data) {
  let ul = $('#z-summary-list');
  let li = $('<li>').append('Nights in database: ' + data['nights']);
  let subul = $('<ul>')
      .append($('<li>').append('With data: ' + data['nights with data']))
      .append($('<li>').append('Most recent night checked: ' + data['most recent night checked']));
  li.append(subul);
  ul.append(li);

  li = $('<li>').append('Targets:');
  subul = $('<ul>')
    .append($('<li>').append('With ZTF coverage: ' + data['targets with coverage']))
    .append($('<li>').append('Covered on most recent night: ' + data['most recent targets']))
  li.append(subul);
  ul.append(li);

  let pointing = $('#z-pointing');
  let frames = {
    'Equatorial': 'eq',
    'Ecliptic': 'ec',
    'Galactic': 'gal'
  }
  for (var frame in frames) {
    pointing.append(imageCard(
      4, frame,
      'img/pointing/' + data['most recent night checked'] + '-'
	+ frames[frame]	+ '.png'
    ));
  }
  
  $('#z-summary-loading-indicator').removeClass('loading');

  return query('obs-by-date', data['most recent night checked']);
}

function obsByDate(data) {
  $('#z-lightcurve-section').hide();
  $('#z-target-lightcurve').empty();
  $('#z-stacks-section').show();

  let targetTable = $('#z-obs-table');

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];
    stackCards('#z-stacks', data['stacks']);
  } else {
    tableData = [];
  }
  
  targetTable.DataTable({
    destroy: true,
    data: tableData,
    order: [],
    columns: [
      {
	title: 'Desg',
	'render': (desg) =>  '<a href="?obs-by-target=' + desg + '">' + desg.replace(' ', ' ') + '</a>',
	type: 'natural',
	sort: (desg) => desg.match('([0-9]+)(.*)').slice(1, 3)
      },
      { title: 'Date (UT)' },
      { title: 'ProgID' },
      {
	title: 'RA (hr)',
	'render': function(data) { return sexagesimal(data / 15, 1, 2).substring(1); }
      },
      {
	title: 'Dec (deg)',
	'render': function(data) { return sexagesimal(data, 0, 2); }
      },
      { title: '&mu; (arcsec/hr)' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'T-T<sub>P</sub> (days)' },
      { title: 'Images' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'Cen. offset (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'Filter' },
      {
	title: 'm(5") (mag)',
	'render': (data) => (Object.keys(data).length ? data['5'] : '')
      },
      {
	title: 'σ<sub>m</sub> (mag)',
	'render': (data) => (Object.keys(data).length ? data['5'] : '')
      },
      { title: 'Flag' },
      { 
	title: 'OStat',
	render: x => formatNumber(x, 1)
      }
    ]
  });

  $('#z-obs-by-date-loading-indicator').removeClass('loading');
}

function obsByTarget(data) {
  let lcTable = $('#z-lightcurve-table');
  let targetTable = $('#z-obs-table');

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];
    stackCards('#z-stacks', data['stacks']);
  } else {
    tableData = [];
  }

  targetTable.DataTable({
    dom: 'Bfrtip',
    buttons: ['csv'],
    destroy: true,
    data: tableData,
    order: [],
    columns: [
      { title: 'Date (UT)' },
      { title: 'ProgID' },
      {
	title: 'RA (hr)',
	'render': function(data) { return sexagesimal(data / 15, 1, 2).substring(1); }
      },
      {
	title: 'Dec (deg)',
	'render': function(data) { return sexagesimal(data, 0, 2); }
      },
      { title: '&mu; (arcsec/hr)' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'T-T<sub>P</sub> (days)' },
      { title: 'Images' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'Cen. offset (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'Filter' },
      {
	/* sync column index with aperturePicker */
	title: 'm (mag)',
	'render': (data) => (Object.keys(data).length ? data[
	  $('#z-target-lightcurve-aperture').val()] : '')
      },
      {
	/* sync column index with aperturePicker */
	title: 'σ<sub>m</sub> (mag)',
	'render': (data) => (Object.keys(data).length ? data[
	  $('#z-target-lightcurve-aperture').val()] : '')
      },
      { title: 'Flag' },
      { 
	title: 'OStat',
	render: x => formatNumber(x, 1)
      }
    ]
  });

  $('#z-obs-by-target-loading-indicator').removeClass('loading');
}


function whereFilterIs(name, filter) {
  return function(element, index) {
    return filter[index] == name;
  };
}

function photByTarget(data) {
  let lightcurve = $('#z-target-lightcurve');
  lightcurve.empty();

  let layout = {
    title: data['target'],
    xaxis: {
      title: "T–Tp (days)",
    },
    yaxis: {
      title: "m (mag)",
      autorange: "reversed"
    }
  }
  Plotly.newPlot(lightcurve[0], [], layout);
  lightcurve.append('<a href="phot-by-target?target=' + data['target'] + '">Download raw photometry</a>');

  photometry = data;
  updatePhotometry();
}

function updatePhotometry() {
  updatePhotometryPlot();
  updatePhotometryTable();
}

function updatePhotometryTable() {
  let table = $('#z-obs-table').DataTable();
  table.column(13).cells().invalidate().render();
  table.column(14).cells().invalidate().render();
}

/*
    example colors: g-r=0.56, r-i=0.17
    Solontoi et al. (2010) median colors transformed to PS1 system:
      g-r|SDSS = 0.57 ± 0.06
      → g-r|P1 = 0.49 mag
      r-i|SDSS = 0.24 ± 0.08
      → r-i|P1 = 0.24 mag
*/
function updatePhotometryPlot() {
  let lightcurve = $('#z-target-lightcurve');
  let aperture = $('#z-target-lightcurve-aperture');
  let color = {
    'zg': $('#z-target-lightcurve-gmr').val(),
    'zr': 0,
    'zi': -1 * $('#z-target-lightcurve-rmi').val()
  };

  let traces = [];
  for (let i = 0; i < lightcurve[0].data.length; i += 1) {
    traces.push(i);
  }
  Plotly.deleteTraces(lightcurve[0], traces);

  if (photometry['valid'] !== false) {
    let i = aperture.val();
    let phot = photometry['table'];
    
    let jpl = {
      v: [],
      tmtp: []
    };
    let filter = [];
    let m = [];
    let merr = [];
    let tmtp = [];

    for (let row of phot) {
      jpl.v.push(row['V']);
      jpl.tmtp.push(row['tmtp']);

      if (row['m'][i] == 0) {
	// some magnitudes are zero
	continue;
      }
      if (row['merr'][i] > 0.2) {
	// some uncertainties are too big
	continue;
      }
      tmtp.push(row['tmtp']);
      filter.push(row['filter']);
      m.push(row['m'][i] - color[row['filter']]);
      merr.push(row['merr'][i]);
    }

    Plotly.addTraces(lightcurve[0], {
      name: 'V(JPL)',
      x: jpl.tmtp,
      y: jpl.v,
      mode: 'markers',
      marker: {
	color: 'black',
	symbol: 'x'
      },
      type: 'scatter'
    });

    let zg = whereFilterIs('zg', filter);
    Plotly.addTraces(lightcurve[0], {
      name: 'g' + (color['zg']<0?"+":"-") + Math.abs(color['zg']),
      x: tmtp.filter(zg),
      y: m.filter(zg),
      error_y: {
	type: "data",
	array: merr.filter(zg),
	visible: true,
	color: 'gray'
      },
      mode: 'markers',
      marker: {
	color: 'green',
	symbol: 'circle'
      },
      type: 'scatter'
    });

    let zr = whereFilterIs('zr', filter);
    Plotly.addTraces(lightcurve[0], {
      name: 'r',
      x: tmtp.filter(zr),
      y: m.filter(zr),
      error_y: {
	type: "data",
	array: merr.filter(zr),
	visible: true,
	color: 'gray'
      },
      mode: 'markers',
      marker: {
	color: 'orange',
	symbol: 'square'
      },
      type: 'scatter'
    });

    let zi = whereFilterIs('zi', filter);
    Plotly.addTraces(lightcurve[0], {
      name: 'i' + (color['zi']<0?"+":"-") + Math.abs(color['zi']),
      x: tmtp.filter(zi),
      y: m.filter(zi),
      error_y: {
	type: "data",
	array: merr.filter(zi),
	visible: true,
	color: 'gray'
      },
      mode: 'markers',
      marker: {
	color: 'red',
	symbol: 'triangle-up'
      },
      type: 'scatter'
    });
  }
}

function targetSummary(data) {
  let summaryTable = $('#z-target-table');

  summaryTable.DataTable({
    dom: 'Bfrtip',
    buttons: ['csv'],
    destroy: true,
    data: data,
    order: [[3, 'desc']],
    columns: [
      {
	title: 'Desg',
	data: 'desg',
	'render': (desg) =>  '<a href="?obs-by-target=' + desg + '">' + desg.replace(' ', ' ') + '</a>',
	type: 'natural',
	sort: (desg) => desg.match('([0-9]+)(.*)').slice(1, 3)
      },
      {	title: 'N obs', data: 'nobs' },
      { title: 'N nights', data: 'nnights' },
      { title: 'Last night', data: 'last_night' },
      { title: 'V<sub>JPL</sub> (mag)', data: 'vmag' },
      { title: 'r<sub>h</sub> (au)', data: 'rh' },
      {
	/* sync column index with aperturePicker */
	title: 'm (mag)',
	data: 'm',
	'render': (data) => (Object.keys(data).length ? data[
	  $('#z-target-lightcurve-aperture').val()] : '')
      },
      {
	/* sync column index with aperturePicker */
	title: 'σ<sub>m</sub> (mag)',
	data: 'merr',
	'render': (data) => (Object.keys(data).length ? data[
	  $('#z-target-lightcurve-aperture').val()] : '')
      },
      { 
	title: 'OStat', 
	data: 'ostat', 
	render: x => formatNumber(x, 1) 
      },
      { title: 'N(g)', data: 'ng' },
      { title: 'N(r)', data: 'nr' },
      { title: 'N(i)', data: 'ni' }
    ]
  });
}

$(document).ready(function() {
  let url = new URL(window.location.href);
  if (url.searchParams.get('obs-by-target') !== null) {
    // observations by target
    $('#z-pointing-section').hide();
    $('#z-lightcurve-section').show();
    if (url.searchParams.get('obs-by-target') != "") {
      let target = url.searchParams.get('obs-by-target');
      $('#z-target-input').val(target);
      setup()
	.then(() => query('obs-by-target', target))
	.then(data => obsByTarget(data))
	.then(() => query('phot-by-target', target))
	.then(data => photByTarget(data));
    } else {
      setup();
    }
  } else if (url.searchParams.get('obs-by-date') !== null) {
    // observations by date
    $('#z-pointing-section').show();
    $('#z-lightcurve-section').hide();
    if (url.searchParams.get('obs-by-date') != "") {
      let date = url.searchParams.get('obs-by-date');
      $('#z-date-input').val(date);
      $('#z-obs-by-date-loading-indicator').addClass('loading');
      setup()
	.then(() => query('obs-by-date', date))
	.then(data => obsByDate(data));
    } else {
      setup();
    }
  } else {
    // default: status
    $('#z-pointing-section').show();
    $('#z-observation-table-section').hide();
    $('#z-lightcurve-section').hide();
    $('#z-summary-loading-indicator').addClass('loading');
    setup()
      .then(() => query('status'))
      .then(data => status(data))
      .then(data => obsByDate(data))
      .then(() => query('target-summary'))
      .then(data => targetSummary(data));
  }

  $('#z-target-lightcurve-aperture').change(
    () => updatePhotometry());
  $('#z-target-lightcurve-gmr').change(
    () => updatePhotometryPlot());
  $('#z-target-lightcurve-rmi').change(
    () => updatePhotometryPlot());
});

var photometry;
