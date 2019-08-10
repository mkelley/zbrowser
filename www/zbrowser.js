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
		       'targets', 'phot-by-target'];
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
  return $('<div class="col-sm-12 col-lg-' + size + '">').append(
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
  $('#z-lightcurves-section').show();
  $('#z-stacks-section').show();

  let stacks = $('#z-stacks');
  let lightcurves = $('#z-lightcurves');
  let targetTable = $('#z-obs-table');

  stacks.empty();
  lightcurves.empty();

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];

    for (var i = 0; i < data['stacks'].length; i++) {
      let stack = data['stacks'][i][0];
      let desg = data['stacks'][i][1];
      let filter = data['stacks'][i][2];
      let maglimit = data['stacks'][i][3];
      let rh = data['stacks'][i][4];
      let tmtp = data['stacks'][i][5];

      // one lightcurve per target
      let id = 'z-lightcuves-' + desg.replace(/[ \/]/g, '');
      if ($('#' + id).length === 0) {
	let plot = '<div id="' + id + '-plot"></div>';
	let title = '<a href="?obs-by-target=' + desg + '">' + desg +
	  '</a> (' + rh + ' au)';
	let lcCard = lightcurveCard(4, title, plot);
	lcCard.attr('id', id);
	lightcurves.append(lcCard);
//	  .then(data => photByTarget(data, lightcurveElements));
      }
      
      let title = '<a href="?obs-by-target=' + desg + '">' + desg +
	'</a> (' + filter + ', ' + rh + ' au, T–Tp=' + tmtp + 
	' maglimit=' + maglimit + ')';
      let img = 'img/stacks/' + stack.replace('.fits', '.png')
      stacks.append(imageCard(8, title, img));
    }
  } else {
    tableData = [];
  }
  
  targetTable.DataTable({
    destroy: true,
    data: tableData,
    order: [],
    columns: [
      { title: 'Target' },
      { title: 'Date (UT)' },
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
	'render': function(data) { return (Object.keys(data).length ? data[3] : ''); }
      },
      {
	title: 'σ<sub>m</sub> (mag)',
	'render': function(data) { return (Object.keys(data).length ? data[3] : ''); }
      },
      { title: 'Flag' }
    ]
  });

  $('#z-obs-by-date-loading-indicator').removeClass('loading');
}

function obsByTarget(data) {
  $('#z-lightcurves').empty();
  let lcTable = $('#z-lightcurve-table');
  let stacks = $('#z-stacks');
  let targetTable = $('#z-obs-table');

  stacks.empty();

  //let carousel = newCarousel('z-stack-carousel');
  //stacks.append(carousel);

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];

    for (var i = 0; i < data['stacks'].length; i++) {
      let stack = data['stacks'][i][0];
      let date = stack.split('-')[1];
      date = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)].join('-');
      let filter = data['stacks'][i][1];
      let maglimit = data['stacks'][i][2];
      let rh = data['stacks'][i][3];
      let tmtp = data['stacks'][i][4];

      let title = date + ' (' + filter + ', ' + rh + ' au, T–Tp='
	+ tmtp + ' maglimit=' + maglimit + ')';
      let img = 'img/stacks/' + stack.replace('.fits', '.png')
      stacks.append(imageCard(8, title, img));
      //addToCarousel(carousel, title, img, i == 0);
    }
  } else {
    tableData = [];
  }
  
  targetTable.DataTable({
    destroy: true,
    data: tableData,
    order: [],
    columns: [
      { title: 'Date (UT)' },
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
	'render': function(data) { return (Object.keys(data).length ? data["5"] : ''); }
      },
      {
	title: 'σ<sub>m</sub> (mag)',
	'render': function(data) { return (Object.keys(data).length ? data["5"] : ''); }
      },
      { title: 'Flag' }
    ]
  });

  $('#z-obs-by-target-loading-indicator').removeClass('loading');
}


function whereFilterIs(name, filter) {
  return function(element, index) {
    return filter[index] == name;
  };
}

/* elements: see updatePhotometryPlot */
function photByTarget(data, elements) {
  let lightcurve = $(elements.lightcurve);
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

  photometry = data;
  updatePhotometryPlot(elements);
}

/*
  elements:
    lightcurve (div)
    aperture (select)
    gmr (input [number])
    rmi (input [number])

    example colors g-r=0.56, r-i=0.17
*/
function updatePhotometryPlot(elements) {
  let lightcurve = $(elements.lightcurve);
  let aperture = $(elements.aperture);
  let color = {
    'zg': $(elements.gmr).val(),
    'zr': 0,
    'zi': -1 * $(elements.rmi).val()
  };

  let traces = [];
  for (let i = 0; i < lightcurve[0].data.length; i += 1) {
    traces.push(i);
  }
  Plotly.deleteTraces(lightcurve[0], traces);

  if (photometry['valid'] !== false) {
    let i = aperture.val();
    let phot = photometry['table'];
    
    let tmtp = [];
    let filter = [];
    let m = [];
    let merr = [];

    for (let row of phot) {
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

    let zg = whereFilterIs('zg', filter);
    Plotly.addTraces(lightcurve[0], {
      name: 'g' + (color['zg']<0?"-":"+") + color['zg'],
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
      name: 'i' + (color['zi']<0?"-":"+") + color['zi'],
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

function emptyTable(id) {
  $(id).html('<table class="table table-striped table-sm" id="z-obs-table" data-page-length="50"><thead class="thead-dark"></thead><tbody></tbody></table>');
}

$(document).ready(function() {
/*
  $('#z-obs-by-target-form').submit(function(e) {
    e.preventDefault();
    //emptyTable('#z-obs-table');
    $('#z-obs-by-target-loading-indicator').addClass('loading');
    query('obs-by-target', $('#z-target-input').val())
      .then(data => obsByTarget(data));
  });
  $('#z-obs-by-date-form').submit(function(e) {
    e.preventDefault();
    emptyTable('#z-obs-table');
    $('#z-obs-by-date-loading-indicator').addClass('loading');
    query('obs-by-date', $('#z-date-input').val())
      .then(data => obsByDate(data));
  });*/

  let lightcurveElements = {
    lightcurve: '#z-target-lightcurve',
    aperture: '#z-target-lightcurve-aperture',
    gmr: '#z-target-lightcurve-gmr',
    rmi: '#z-target-lightcurve-rmi'
  };

  let url = new URL(window.location.href);
  if (url.searchParams.get('obs-by-target') !== null) {
    // observations by target
    $('#z-pointing-section').hide();
    $('#z-lightcurves-section').hide();
    $('#z-lightcurve-section').show();
    if (url.searchParams.get('obs-by-target') != "") {
      let target = url.searchParams.get('obs-by-target');
      $('#z-target-input').val(target);
      setup()
	.then(() => query('obs-by-target', target))
	.then(data => obsByTarget(data))
	.then(() => query('phot-by-target', target))
	.then(data => photByTarget(data, lightcurveElements));
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
    $('#z-lightcurve-section').hide();
    $('#z-summary-loading-indicator').addClass('loading');
    setup()
      .then(() => query('status'))
      .then(data => status(data))
      .then(data => obsByDate(data));
  }

  $('#z-target-lightcurve-aperture').change(
    () => updatePhotometryPlot(lightcurveElements));
  $('#z-target-lightcurve-gmr').change(
    () => updatePhotometryPlot(lightcurveElements));
  $('#z-target-lightcurve-rmi').change(
    () => updatePhotometryPlot(lightcurveElements));

});

var photometry;
