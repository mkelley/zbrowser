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
  if (['status', 'obs-by-target', 'obs-by-date', 'targets'].indexOf(parameter) === -1) {
    throw new Error('Bad internal query: ' + parameter);
  }

  let q = "";
  if (['obs-by-target'].indexOf(parameter) !== -1) {
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

function card(size, title, img) {
  return $('<div class="col-sm-12 col-lg-' + size + '">').append(
    $('<div class="card">').append(
      $('<h5 class="card-header">').append(title),
      $('<a href="' + img + '">').append(
	$('<img class="card-img-top" src="' + img + '">')
      )
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
    pointing.append(card(
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

      // one lightcurve per target
      let id = 'lc-' + desg.replace(/[ \/]/g, '');
      if ($('#' + id).length === 0) {
	let img = 'img/lightcurves/lc_'
	  + desg.replace(/[ \/]/g, '_') + '.png';
	let title = '<a href="?obs-by-target=' + desg + '">' + desg +
	  '</a> (' + rh + ' au)';
	let lcCard = card(4, title, img);
	lcCard.attr('id', id);
	lightcurves.append(lcCard);
      }
      
      let title = '<a href="?obs-by-target=' + desg + '">' + desg +
	'</a> (' + filter + ', ' + rh + ' au, maglimit=' + maglimit + ')';
      let img = 'img/stacks/' + stack.replace('.fits', '.png')
      stacks.append(card(8, title, img));
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
      { title: 'Filter' },
      {
	title: 'RA (hr)',
	'render': function(data) { return sexagesimal(data / 15, 1, 2).substring(1); }
      },
      {
	title: 'Dec (deg)',
	'render': function(data) { return sexagesimal(data, 0, 2); }
      },
      { title: '&mu; (arcsec/hr)' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'T-T<sub>P</sub> (days)' },
      { title: 'Images' },
    ]
  });

  $('#z-obs-by-date-loading-indicator').removeClass('loading');
}

function obsByTarget(data) {
  $('#z-lightcurves').empty();
  let lightcurve = $('#z-target-lightcurve');
  let lcTable = $('#z-lightcurve-table');
  let stacks = $('#z-stacks');
  let targetTable = $('#z-obs-table');

  stacks.empty();
  lightcurve.empty();

  let carousel = newCarousel('z-stack-carousel');
  stacks.append(carousel);

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];

    lightcurve.append(
      card(
	6, 'Lightcurve',
	'img/lightcurves/lc_' + data['target'].replace(/[ \/]/g, '_')
      )
    );

    for (var i = 0; i < data['stacks'].length; i++) {
      let stack = data['stacks'][i][0];
      let date = stack.split('-')[1];
      date = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)].join('-');
      let filter = data['stacks'][i][1];
      let maglimit = data['stacks'][i][2];
      let rh = data['stacks'][i][3];
      let title = date + ' (' + filter + ', ' + rh + ' au, maglimit='
	  + maglimit + ')';
      let img = 'img/stacks/' + stack.replace('.fits', '.png')
      //stacks.append(card(8, title, img));
      addToCarousel(carousel, title, img, i == 0);
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
      { title: 'Filter' },
      {
	title: 'RA (hr)',
	'render': function(data) { return sexagesimal(data / 15, 1, 2).substring(1); }
      },
      {
	title: 'Dec (deg)',
	'render': function(data) { return sexagesimal(data, 0, 2); }
      },
      { title: '&mu; (arcsec/hr)' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'm (mag)' },
      { title: 'σ (mag)' },
      { title: 'Flag' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'T-T<sub>P</sub> (days)' },
      { title: 'Images' },
    ]
  });

  $('#z-obs-by-target-loading-indicator').removeClass('loading');
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
	.then(data => obsByTarget(data));
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
});
