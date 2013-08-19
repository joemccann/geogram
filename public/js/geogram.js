$(document).ready(function(){
  
  log('Ready...')
  
  // Global
  window.Geogram = {position:null, hasTouch:true}
  
  // Check for touch events (note: this is not exhaustive) and thanks to the Surface
  // and the Chromebook Pixel...
  if( !('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch){
    document.documentElement.className = "no-touch"
    Geogram.hasTouch = false
  } 


  /**
   * Utility method to async load a JavaScript file.
   *
   * @param {String} The name of the file to load
   * @param {Function} Optional callback to be executed after the script loads.
   * @return {void}
   */
  function asyncLoad(filename,cb){
    (function(d,t){

      var leScript = d.createElement(t)
        , scripts = d.getElementsByTagName(t)[0]
      
      leScript.async = 1
      leScript.src = filename
      scripts.parentNode.insertBefore(leScript,scripts)

      leScript.onload = function(){
        cb && cb()
      }

    }(document,'script'))
  }


  /* Handle Search Form ****************************************/
  
  var $form = $('#search-form')
    , $button = $('#search-button')

  function strip(html){
     var tmp = document.createElement("div")
     tmp.innerHTML = html
     return tmp.textContent || tmp.innerText
  }

  // quick and dirty way of showing the Instagrams
  function displayInstagrams(json){

    $('#instagram-photos-container').find('ul').remove()

    if(!json) return alert('No Photos to Show')

    var photos = json.data
      , ul = "<ul class='instagram-list'>"

    photos.forEach(function(el,i){
      ul += "<li><a target=\"_blank\" href='"+el.link+"'><img src='"+el.images.standard_resolution.url+"'></a></li>"
    })

    ul += "</ul>"

    $('#instagram-photos-container').append(ul)
  }

    
  if($form.length){

    $button.on('click', function(e){
      searchHandler(e)
      e.preventDefault()
      return false

    }) // end click()
    
    $form.on('submit', function(e){
      searchHandler(e)
      e.preventDefault()
      return false

    }) // end submit()
    
  }

  /* End Search Form *******************************************/


  /* Google Maps ***********************************************/

  if(Geogram.hasTouch){
    asyncLoad('https://maps.googleapis.com/maps/api/js?key=AIzaSyAehXjQK7Py8-F6qgq5MowUR_Azfyvz1QU&sensor=true&callback=Geogram.initMap')
  }
  else{
    asyncLoad('https://maps.googleapis.com/maps/api/js?key=AIzaSyAehXjQK7Py8-F6qgq5MowUR_Azfyvz1QU&sensor=false&callback=Geogram.initMap')
  }


  // Because we are conditionally setting the touch sensor boolean, we have to 
  // add the callback to the script src as a paramter, which is here, global.
  Geogram.initMap = function(){

    var map; 

    // Get user's location and stash...
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(geoSuccess, geoError)
    } 
    else geoError("Not supported.")
    
    function geoSuccess(position) {
      Geogram.position = position.coords
      createMap()
    }

    function geoError(msg) {
      log(arguments)
      Geogram.position = null
      createMap()
    }

    // Create map with initial position.
    function createMap(){

      var initLat = Geogram.position ? Geogram.position.latitude : 40.762485
        , initLon = Geogram.position ? Geogram.position.longitude : -73.99751300000003 

      var centerPoint = new google.maps.LatLng(initLat,initLon)

      var mapOptions = {
        center: centerPoint,
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      }

      map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions)
      
      $('#latitude').val(initLat)
      $('#longitude').val(initLon)

      var infowindow = new google.maps.InfoWindow()

      var centerMarker = new google.maps.Marker({
            position: centerPoint,
            map: map,
            animation: google.maps.Animation.DROP
          })

      // Listen for click event on infomarker  
      google.maps.event.addListener(centerMarker, 'click', function(event) {
        var lat = Number((event.latLng.mb).toFixed(4))
        var lon = Number((event.latLng.nb).toFixed(4))
        infowindow.setContent("Latitude: "+ lat + "<br>Longitude: "+ lon + "<br>")
        infowindow.open(map, centerMarker);
      })

          // listen for click on map canvas 
    google.maps.event.addListener(map, 'click', function(event) {

      var mapsLat = event.latLng.mb
      var mapsLng = event.latLng.nb

      $('#latitude').val(mapsLat)
      $('#longitude').val(mapsLng)

      marker = new google.maps.Marker({position: event.latLng, map: map})

    }) // end eventListener click

    }
    

    function createPointAndCenterIt(lat,lon){

      var centerPoint = new google.maps.LatLng(lat,lon)

      var centerMarker = new google.maps.Marker({
            position: centerPoint,
            map: map,
            animation: google.maps.Animation.DROP
          })


      var infowindow = new google.maps.InfoWindow()

      // Listen for click event on infomarker  
      google.maps.event.addListener(centerMarker, 'click', function(event) {
        var lat = Number((event.latLng.mb).toFixed(4))
        var lon = Number((event.latLng.nb).toFixed(4))
        infowindow.setContent("Latitude: "+ lat + "<br>Longitude: "+ lon + "<br>")
        infowindow.open(map, centerMarker);
      })

    } // createPointAndCenterIt()
      

    // Wire up geocode button click handler.
    $('#geocode-button').on('click', function(e){
      codeAddress()
      e.preventDefault()
      return false
    }) // end click()

    // 
    $('#address').on('focus', toggleOriginalValue) 
    $('#address').on('blur', toggleOriginalValue) 


    // toggle between an element's original value and blank
    function toggleOriginalValue(){
      if(this._stash) return
      
      this._stash = this.value

      return this.value = ''

    }

    // Geocode address and update lat/lng values
    function codeAddress(){

      var address = document.getElementById('address').value
        , geocoder = new google.maps.Geocoder()
        ;

      geocoder.geocode( { 'address': address}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK){
          var position = results[0].geometry.location
          map.setCenter(position);
          
          var marker = new google.maps.Marker({
              map: map,
              position: position
          })

          $('#latitude').val(position.mb)
          $('#longitude').val(position.nb)

        }
        else alert('Geocode was not successful for the following reason: ' + status)
      }) // end geocode()

    } // end codeAddress
  
  } // end initMap

  /* End Google Maps ********************************************/


  /* Engine.io **************************************************/

  var socket = new eio.Socket()

  socket.onopen = function(){
    log("socket opened")
    socket.send('ping')
  }

  socket.onclose = function(){
    log("socket closed")
  }

  socket.onmessage = function(msg){

    try{msg = JSON.parse(msg)}catch(e){}

    if(msg.type && (msg.type == 'geogram-search')){

      $button.removeAttr('disabled').removeClass('opacity75').blur()

      log(msg.data)

      if(msg.error) return alert(msg.data)

      displayInstagrams(msg.data)

    }

    else log(msg.data)

  }

  var searchHandler = function(e){

    $button.attr('disabled', true).addClass('opacity75')
    
    $('.error').removeClass('error')
    
    var $latitude = $('#latitude')
      , $longitude = $('#longitude')
      , $distance = $('#distance')

        
    // Sanitize...
    $latitude.val( strip( $latitude.val() ) ) 
    $longitude.val( strip( $longitude.val() ) ) 
    $distance.val( strip( $distance.val() ) ) 

    // Validate latitude
    if( $latitude.val().length < 2 ){
      log('Need Latitude.')
      $latitude
        .val('')
        .addClass('error')
        .focus()
      
      $button.removeAttr('disabled').removeClass('opacity75')
        
      return false
      
    }    

    // Validate longitude
    if( $longitude.val().length < 2 ){
      log('Need Longitude.')
      $longitude
        .val('')
        .addClass('error')
        .focus()
      
      $button.removeAttr('disabled').removeClass('opacity75')
        
      return false
      
    }// todo check for numbers        

    socket.send( JSON.stringify( { type:'geogram-search', data: $form.serialize() } ) )

    return false
    
  }


  /* End Engine.io **********************************************/

  
}) // end DOM ready
