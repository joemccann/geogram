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
      , ul = "<ul>"

    photos.forEach(function(el,i){
      ul += "<li><a href='"+el.link+"'><img src='"+el.images.standard_resolution.url+"'></a></li>"
    })

    ul += "</ul>"

    $('#instagram-photos-container').append(ul)
  }

    
  if($form.length){

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


      $.ajax({
        type: 'POST',
        url: '/search/geo',
        data: $form.serialize(),
        dataType: 'json',
        success: function(data){
          // This is a weird delta between zepto and jquery...
          var r = (typeof data === 'string') ? JSON.parse(data) : data

          log(r)

          if(r.meta.code > 399){
            log(r.meta.code + " is response code.")
            alert(r.meta.error_message)
          }
          else{
            displayInstagrams(r)
          }
          
          $button.removeAttr('disabled').removeClass('opacity75').blur()
        },
        error: function(xhr, type){
          // jesus fix this
          if(xhr.status === 400) alert(xhr.responseText)
          if(xhr.status === 403) alert(xhr.responseText)
          if(xhr.status === 404) alert(xhr.responseText)
          if(xhr.status === 500) alert(xhr.responseText)
          $button.removeAttr('disabled').removeClass('opacity75').blur()
        }
      })

      return false
      
    }
    
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
      
    var centerPoint = new google.maps.LatLng(40.754854,-73.984166)

    var mapOptions = {
      center: centerPoint,
      zoom: 13,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }

    var map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions)

    var centerMarker = new google.maps.Marker({
          position: centerPoint,
          map: map,
          animation: google.maps.Animation.DROP
    })


    var infowindow = new google.maps.InfoWindow()

    // Listen for click event  
    google.maps.event.addListener(centerMarker, 'click', function(event) {
      infowindow.setContent("Latitude: "+ event.latLng.lb + "<br>Longitude: "+ event.latLng.mb)
      infowindow.open(map, centerMarker);
    })


    google.maps.event.addListener(map, 'click', function(event) {

      var mapsLat = event.latLng.mb
      var mapsLng = event.latLng.nb

      $('#latitude').val(mapsLat)
      $('#longitude').val(mapsLng)

      marker = new google.maps.Marker({position: event.latLng, map: map})

    }) // end eventListener click

    // Wire up geocode button click handler.
    $('#geocode-button').on('click', function(e){
      codeAddress()
      e.preventDefault()
      return false
    }) // end click()


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

  
}) // end DOM ready
