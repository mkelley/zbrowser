// Licensed under a 3-clause BSD style license - see LICENSE
'use strict';

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
      targets.forEach(function(target) {
	let option = document.createElement('option');
	option.value = target;
	dataList.appendChild(option);
      });
    }
  );
}

function card(size, title, img) {
  return $('<div class="col-sm-' + size + '">').append(
    $('<div class="card">').append(
      $('<h5 class="card-header">').append(title),
      $('<a href="' + img + '">').append(
	$('<img class="card-img-top" src="' + img + '">')
      )
    )
  );
}

function status(data) {
  obsByDate(data);
  
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
    .append($('<li>').append('Covered on most recent night: ' + data['targets observed last night'].length))
    .append($('<li>').append('Covered in the last week: ' + data['target table'].length));
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
}

function obsByDate(data) {
  $('#z-lightcurve-section').hide();
  $('#z-target-lightcurve').empty();
  let stacks = $('#z-stacks');
  let targetTable = $('#z-obs-table');

  stacks.empty();

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];

    for (var i = 0; i < data['stacks'].length; i++) {
      let desg = data['stacks'][i][0];
      let filter = data['stacks'][i][1];
      let stack = data['stacks'][i][2];
      let maglimit = data['stacks'][i][3].toFixed(1);
      let rh = data['stacks'][i][4].toFixed(3);

      let img = 'img/stacks/' + stack.replace('.fits.gz', '.png')
      let title = '<a href="?obs-by-target=' + desg + '">' + desg +
	'</a> (' + filter + ', ' + rh + ' au, maglimit=' + maglimit + ')';
      stacks.append(card(12, title, img));
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
      { title: '&mu; (arcsec/hr)' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'f (deg)' },
      { title: 'T-T<sub>P</sub> (days)' },
      { title: 'Images' },
    ]
  });

  $('#z-obs-by-date-loading-indicator').removeClass('loading');
}

function obsByTarget(data) {
  let lightcurve = $('#z-lightcurve');
  let stacks = $('#z-stacks');
  let targetTable = $('#z-obs-table');

  stacks.empty();
  lightcurve.empty();

  let tableData;
  if (data['valid'] !== false) {
    tableData = data['table'];

    lightcurve.append(
      card(
	6, 'Lightcurve',
	'img/lightcurves/lc_' + data['target'].replace(/[ \/]/g, '-')
      )
    );

    for (var i = 0; i < data['stacks'].length; i++) {
      let stack = data['stacks'][i][0];
      let date = stack.split('-')[1];
      date = [date.slice(0, 4), date.slice(4, 6), date.slice(6, 8)].join('-');
      let filter = stack.split('-')[3];
      let maglimit = data['stacks'][i][1];
      let rh = data['stacks'][i][2];
      let title = date + ' (' + filter + ', ' + rh + ' au, maglimit='
	  + maglimit + ')';
      let img = 'img/stacks/' + stack.replace('.fits.gz', '.png')
      stacks.append(card(12, title, img));
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
      { title: '&mu; (arcsec/hr)' },
      { title: 'Eph. 3&sigma; (arcsec)' },
      { title: 'V<sub>JPL</sub> (mag)' },
      { title: 'r<sub>h</sub> (au)' },
      { title: '&Delta; (au)' },
      { title: 'Phase (deg)' },
      { title: 'f (deg)' },
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
  });

  let url = new URL(window.location.href);
  if (url.searchParams.get('obs-by-target') !== null) {
    // observations by target
    //emptyTable('#z-obs-table');
    $('#z-pointing-section').hide();
    $('#z-ligthcurve-section').show();
    if (url.searchParams.get('obs-by-target') != "") {
      $('#z-target-input').val(url.searchParams.get('obs-by-target'));
      setup().then(() => $('#z-obs-by-target-form').submit());
    } else {
      setup();
    }
  } else if (url.searchParams.get('obs-by-date') !== null) {
    // observations by date
    //emptyTable('#z-obs-table');
    $('#z-pointing-section').hide();
    $('#z-ligthcurve-section').show();
    if (url.searchParams.get('obs-by-date') != "") {
      $('#z-date-input').val(url.searchParams.get('obs-by-date'));
      setup().then(() => $('#z-obs-by-date-form').submit());
    } else {
      setup();
    }
  } else {
    // default: status
    $('#z-pointing-section').show();
    $('#z-lightcurve-section').hide();
    $('#z-summary-loading-indicator').addClass('loading');
    setup().then(() => query('status')).then(data => status(data));  
  }
});
