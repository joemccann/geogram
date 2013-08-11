/* Conditional load of zepto or jquery */
var $lib = ('__proto__' in {} ? 'zepto.min' : 'jquery.min')
require(["log",  $lib, "fastclick" ], function(l, zepto){
  log($lib + ', Fastclick and Log loaded...')
  require(["geogram"], function(subprint){
	  new FastClick(document.body)
		log('FastClick enabled on document.')
		log('All JS files loaded...')
  })
})


function initialize() {

  var centerPoint = new google.maps.LatLng(40.754854,-73.984166)
  
  var mapOptions = {
    center: centerPoint,
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  
  var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);

  var marker = new google.maps.Marker({
        position: centerPoint,
        map: map
  });

  google.maps.event.addListener(map, 'click', function(event) {

    console.dir(event.latLng)

    var mapsLat = event.latLng.lb
    var mapsLng = event.latLng.mb

    $('#latitude').val(mapsLat)
    $('#longitude').val(mapsLng)

    marker = new google.maps.Marker({position: event.latLng, map: map});

    console.dir(marker)

  });
}

window.onload = function(){
	initialize()
}

