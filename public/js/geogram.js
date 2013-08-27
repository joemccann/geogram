$(document).ready(function(){
  
  log('Ready...')

  // For debugging only
  if(location.hash.match(/^#debug$/)){
    // Prepopulate value
    log('We are debugging...')
    $('#name_of_folder').val('debug')
    $('#distance').val(500)
    // fix these to be dynamic...
    $('#minUTC').val("2013-08-27")
    $('#maxUTC').val("2013-08-29")
  }

  var render
    , couchdb
    , socket
    , pubsub
    , socketInitArray = []
    ;
  
  // Global
  window.Geogram = {
      uuid: null,
      isBrowserSessionOnly: false
    , hasTouch:true
    , map: {
        init: null
      , canvasId: 'map-canvas'
    }
  }
  
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

  /**
   * Utility method to strip HTML tags from a string
   *
   * @param {String} A potential block of HTML
   * @return {void}
   */
  function strip(html){
     var tmp = document.createElement("div")
     tmp.innerHTML = html
     return tmp.textContent || tmp.innerText
  }


  /**
   * Utility method to return the current client's timezone offset in hours.
   *
   * @return {Number}
   */
  function getTimeZoneOffsetInHours(){
    return (new Date().getTimezoneOffset()) / 60
  }

  /* UI  *******************************************************/


  // We have to set this no matter what.
  $('#timezoneOffset').val( getTimeZoneOffsetInHours() )

  if( $('.md-modal').length ){

    /**
     * modalEffects.js v1.0.0
     * http://www.codrops.com
     *
     * Licensed under the MIT license.
     * http://www.opensource.org/licenses/mit-license.php
     * 
     * Copyright 2013, Codrops
     * http://www.codrops.com
     */

    function initModal(){

      var $overlay = $('.md-overlay')
      , $mdTrigger = $('.md-trigger')
      , $modal = $('#modal-16')
      , $close = $('.md-close' )
      ;

      // console.log('init modal')

      function removeModal( hasPerspective ){

        $modal.removeClass('md-show');

        if( hasPerspective ) {
          $(document.documentElement).removeClass('md-perspective')
        }
      }

      function removeModalHandler() {
        removeModal( $mdTrigger.addClass('md-setperspective' ) ); 
      }

      $modal.addClass('md-show');

      // $overlay.bind('click', removeModalHandler)

      if( $mdTrigger.hasClass('md-setperspective') ){
        setTimeout( function() {
          $(document.documentElement).addClass('md-perspective');
        }, 25 );
      }

      $close.on( 'click', function( ev ) {
        ev.stopPropagation();
        removeModalHandler();
      })

    }

    log('Not logged in so showing modal.')

    setTimeout(function(){
      initModal()
    },300)

  }  // end if modal.length

  // Then we have an Instagram User Object
  if(typeof instagramUser != 'undefined'){
    
    // console.dir(instagramUser)

    setInstagramProfileImage(instagramUser.profile_picture)
    setUserPrefix(instagramUser.username)

    function setInstagramProfileImage(src){
      $('#instagram-profile-image').attr('src',src)
      $('#instagram-profile-image').attr('title','Hey there '+instagramUser.full_name+'!')
    }

    function setUserPrefix(str){
      $('#userprefix').val(str)
    }


  } // end if instagramUser

  // We need to kill the websocket session/looper on backend on unload
  $(window).unload(function(){
    if(Geogram.uuid && Geogram.isBrowserSessionOnly){
      log("sending message killjob for id %s", Geogram.uuid)
      // Then we need to let server know that we are done with this job ID
      socket.emit('killjob', { jobId: Geogram.uuid })
    }
  })


  /* End UI  ***************************************************/

  /* Handle Search Form ****************************************/
  
  var $form = $('#search-form')
    , $button = $('#search-button')
    , $address = $('#address')
    
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

  // Only do this if the map canvas DOM element exists on page
  if( $('#'+ Geogram.map.canvasId).length ){

    // Because we are conditionally setting the touch sensor boolean, we have to 
    // add the callback to the script src as a paramter, which is here, global.
    if(Geogram.hasTouch){
      asyncLoad('https://maps.googleapis.com/maps/api/js?key=AIzaSyAehXjQK7Py8-F6qgq5MowUR_Azfyvz1QU&sensor=true&callback=Geogram.map.init')
    }
    else{
      asyncLoad('https://maps.googleapis.com/maps/api/js?key=AIzaSyAehXjQK7Py8-F6qgq5MowUR_Azfyvz1QU&sensor=false&callback=Geogram.map.init')
    }

  }


  Geogram.map.init = function(){

    var GoogleMap = function(){
      this.markers = []
      this.circles = []
      this.position = {latitude: 40.762485,longitude: -73.9975130}
      this.map = null
    }

    GoogleMap.prototype.initialize = function(){
      // Get user's location and stash...
      var self = this

      if (navigator.geolocation){
        navigator.geolocation.getCurrentPosition(function(position){

          self.geoSuccess(position.coords,function(){

            self.updateInputValues()

            self.createMap(null,function(mark){
              self.bindEvents(mark)
            })
          })

        }, function(err){

          self.geoError(err || new Error('Geo not allowed by user.'),function(){

            self.updateInputValues()

            self.createMap(null,function(mark){
              self.bindEvents(mark)
            })
          })
        })
      } 
      else self.geoError(new Error('Geo not supported.'))
    }

    GoogleMap.prototype.geoSuccess = function(position,cb){
      this.position.latitude = position.latitude
      this.position.longitude = position.longitude
      cb && cb()
    }

    GoogleMap.prototype.geoError = function(err,cb){
      log(err.message)
      cb && cb()
    }

    GoogleMap.prototype.createMap = function(options,cb){

      var initLat = this.position.latitude
        , initLon = this.position.longitude
        , centerPoint = new google.maps.LatLng(initLat,initLon)
        , mapOptions = options || {
            center: centerPoint
          , zoom: 16
          , mapTypeId: google.maps.MapTypeId.ROADMAP
        }

      this.map = new google.maps.Map(document.getElementById(Geogram.map.canvasId), mapOptions)

      var centerMarker = new google.maps.Marker({
            position: centerPoint,
            map: this.map,
            animation: google.maps.Animation.DROP
          })

      this.markers.push(centerMarker)

      this.setRadiusOverlay(centerMarker)

      cb && cb(centerMarker)
    }

    GoogleMap.prototype.bindEvents = function(marker,cb){

      var infowindow = new google.maps.InfoWindow()
        , self = this
        ;

      // Wire up geocode button click handler.
      $('#geocode-button').on('click', function(e){
        self.codeAddress()
        e.preventDefault()
        return false
      }) // end click()

      $address.on('blur', function(e){
        if(!this.value) return false
        else return self.codeAddress()
      }) // end click()


      // Listen for click event on infomarker  
      google.maps.event.addListener(marker, 'click', function(event) {
        var lat = Number((event.latLng.mb).toFixed(4))
        var lon = Number((event.latLng.nb).toFixed(4))
        infowindow.setContent("Latitude: "+ lat + "<br>Longitude: "+ lon + "<br>")
        infowindow.open(map, centerMarker)
      })

      // listen for click on map canvas 
      google.maps.event.addListener(self.map, 'click', function(event){

        var mapsLat = self.position.latitude = event.latLng[Object.keys(event.latLng)[0]]
          , mapsLng = self.position.longitude = event.latLng[Object.keys(event.latLng)[1]]

        self.updateInputValues()

        self.removeAllMarkers()
        self.removeAllCircles()

        var marker = new google.maps.Marker({position: event.latLng, map: self.map})

        self.markers.push(marker)

        self.setRadiusOverlay(marker)

        self.createInfoWindow(marker)

      }) // end eventListener click on canvas

      $('#distance').on('keyup',function(e){

        if((e.keyCode < 47 && e.keyCode !== 8) || (e.keyCode > 57 && e.keyCode !== 8)) return false

        self.removeAllCircles()
        self.setRadiusOverlay(self.markers[0])

      })

      cb && cb()
    }

    GoogleMap.prototype.updateInputValues = function(cb){
      $('#latitude').val( this.position.latitude )
      $('#longitude').val( this.position.longitude )
      cb && cb()
    }

    GoogleMap.prototype.setRadiusOverlay = function(marker,cb){

      var distance = $('#distance').val()

      if(!distance) return
      
      // Add circle overlay and bind to marker
      var circle = new google.maps.Circle({
        map: this.map,
        radius: parseInt( distance ),    // 100 metres
        fillColor: '#AA0000',
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2
      })

      circle.bindTo('center', marker, 'position')

      this.circles.push(circle)

      cb && cb()
    }
    
    GoogleMap.prototype.removeAllMarkers = function(cb){

      if(!this.markers.length) return 

      for (var i = 0,j = this.markers.length; i < j; i++){
        this.markers[i].setMap(null)
      }

      this.markers = []

      cb && cb()
    }

    GoogleMap.prototype.removeAllCircles = function(cb){

      if(!this.circles.length) return 

      for (var i = 0,j = this.circles.length; i < j; i++){
        this.circles[i].setMap(null)
      }

      this.circles = []

      cb && cb()
    }

    GoogleMap.prototype.createInfoWindow = function(marker){

      var infowindow = new google.maps.InfoWindow()

      // Listen for click event on infomarker  
      google.maps.event.addListener(marker, 'click', function(event) {
        var lat = Number((event.latLng.mb).toFixed(4))
        var lon = Number((event.latLng.nb).toFixed(4))
        infowindow.setContent("Latitude: "+ lat + "<br>Longitude: "+ lon + "<br>")
        infowindow.open(this.map, marker);
      })
    }

    GoogleMap.prototype.codeAddress = function(val){

      var address = val || document.getElementById('address').value
        , geocoder = new google.maps.Geocoder()
        , self = this
        ;

      geocoder.geocode({'address': address}, function(results, status){

        if(status == google.maps.GeocoderStatus.OK){

          self.removeAllMarkers()
          self.removeAllCircles()

          self.position.latitude = results[0].geometry.location[Object.keys(results[0].geometry.location)[0]]
          self.position.longitude = results[0].geometry.location[Object.keys(results[0].geometry.location)[1]]

          self.map.setCenter(results[0].geometry.location)
          
          var marker = new google.maps.Marker({
              map: self.map,
              position: results[0].geometry.location
          })

          self.updateInputValues()
          self.markers.push(marker)
          self.setRadiusOverlay(marker)

        }
        else alert('Geocode was not successful for the following reason: ' + status)
      }) // end geocode()
    } 

    // Create the map module instance
    window.googleMap = new GoogleMap()
    googleMap.initialize()

  } // end Geogram.map.init

  /* End Google Maps ********************************************/


  /* Socket.io **************************************************/

  var socket = io.connect('http://'+location.host)

  socket.on('connect', function(){

    log("Socket Connected.")

    executeInitSocketMethods(socketInitArray)

  });

  socket.on('jobremoved', function(data){
    log(data)
  })

  socket.on('geosearch-response', function(data){

    if(data.jobId != Geogram.uuid){
      log("JobId " + data.jobId + "is irrelevant")
      return
    }

    $button.removeAttr('disabled').removeClass('opacity75').blur()

    if(data.error) return alert(data.data)

    $('#instagram-photos-container').find('ul').remove()

    log("Rendering data...")

    render.instagramThumbs( $('#instagram-photos-container'), data.data)

  }) // end socket.on('geosearch-response')

  var toUTC = function(dateString){
    return new Date(dateString).getTime() / 1000
  } 
  
  var searchHandler = function(e){

    $button.attr('disabled', true).addClass('opacity75')
    $('#instagram-photos-container').find('ul').remove()

    
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
      
    }

    // TODO check for numbers     
    // Refactor for less code   

    // We need to make each folder unique to the user
    var cacheFolderValue = $('#name_of_folder').val()

    $('#name_of_folder').val( $('#userprefix').val() +":"+ $('#name_of_folder').val() )

    if(Geogram.uuid && Geogram.isBrowserSessionOnly){
      log("sending messag killjob for id %s", Geogram.uuid)
      // Then we need to let server know that we are done with this job ID
      socket.emit('killjob', { jobId: Geogram.uuid })
    }

    Geogram.uuid = md5( $('#name_of_folder').val() )

    // If either has a value, then it is a proper future job
    if($('#minUTC').val() || $('#maxUTC').val()){
      var preSerialize = $form.serialize()
  
      Geogram.isBrowserSessionOnly = false
  
      // Grab min value
      var minTemp = $('#minUTC').val()
  
      // toUTC it
      var minReplace = toUTC(minTemp)
  
      // Replace it in string  
      preSerialize = preSerialize.replace(minTemp,minReplace)

      // Grab min value
      var maxTemp = $('#maxUTC').val()
  
      // toUTC it
      var maxReplace = toUTC(maxTemp)
  
      // Replace it in string  
      preSerialize = preSerialize.replace(maxTemp,maxReplace)

    }

    // log(Geogram.uuid)
    socket.emit('geosearch', { uuid: Geogram.uuid , data: preSerialize || $form.serialize() } )

    // Update folder value to non-prefix value
    $('#name_of_folder').val(cacheFolderValue)

    return false
 
  } // end searchHandler()

  var executeInitSocketMethods = function(arr){
    
    arr.forEach(function(el){
      el.method.apply(null, el.args)
    })
  }


  /* Engine.io **************************************************

  socket.onmessage = function(msg){

    try{msg = JSON.parse(msg)}catch(e){}

    if(msg.type && (msg.type == 'list-all-couchdb-docs') ){
      
      // console.dir(msg.data)
      
      couchdb.data = msg.data
      
      render.allCouchDbDocs( $('#name_of_folder'), couchdb.data )
      
      render.updateCurrentFolder( $('#name_of_folder'), couchdb.data )
      
      couchdb.fetchDocumentData( couchdb.data.rows[0].id, 'get-couchdb-doc-data' )
    }

    else if(msg.type && (msg.type == 'get-couchdb-doc-data') ){

      // console.dir(msg.data)

      render.couchDbDocument($('#instagram-photos-container'), msg.data)
    }

    else log(msg.data)

  }

*/

  /* End Engine.io **********************************************/

  /* CouchDB Module *********************************************/

  var CouchDB = function(){
 
    (function(){
      
    })()
    
    return {
      data: {}, // pull from local storage? probably stale...
      listAllDocs: function(socketMsgId){
        // console.log('listing all docs with id: %s', socketMsgId)
        socket.send(JSON.stringify( { type: socketMsgId } ))
      },
      fetchDocumentData: function(docName, socketMsgId){
        socket.send(JSON.stringify( { data: docName, type: socketMsgId } ))
      }
    }
  } // end CouchDB

  couchdb = new CouchDB()

  /* End CouchDB Module******************************************/


  /* Render Module **********************************************/

  var Render = function(){
  
    var _instagramThumbsTemplate
      , _allCouchDbDocsTemplate
      , _couchDbDocTemplate
    
    (function(){
      // prefetch handlebars templates
      $.get('/templates/instagram-thumbs.hbs', function(data){
        _instagramThumbsTemplate = Handlebars.compile(data)
      })

      $.get('/templates/list-all-couchdb-docs.hbs', function(data){
        _allCouchDbDocsTemplate = Handlebars.compile(data)
      })

      $.get('/templates/display-couchdb-doc-data.hbs', function(data){
        _couchDbDocTemplate = Handlebars.compile(data)
      })
      

    })()
    
    return {
      instagramThumbs: function($element, data){
        $element.html( _instagramThumbsTemplate( data ) )
       },
      allCouchDbDocs: function($element, data){
        $element.html( _allCouchDbDocsTemplate( data ) )
       },
      updateCurrentFolder: function( $element, val ){
        $element[0]._currentId = val
      },
      couchDbDocument: function($element, data, cb){
        // Let's reverse the data so the latest photo is first.
        data.data = data.data.reverse()
        $element.html( _couchDbDocTemplate( data ) )
        cb && cb()
      }

      }
  } // end Render

  render = new Render()

  /* End Render Module *******************************************/


  /* Show Me  ****************************************************/

  if($('body').hasClass('showme')){

    log('Showme page')

    socketInitArray.push({
      method: couchdb.listAllDocs,
      args: ['list-all-couchdb-docs']
    })

    $('#name_of_folder').on('change', function(e){
      if(this._currentId === this.options[this.selectedIndex].value ) return

      render.updateCurrentFolder($(this), this.options[this.selectedIndex].value)

      couchdb.fetchDocumentData( this.options[this.selectedIndex].value, 'get-couchdb-doc-data' )

    })
    
  }

  /* End Show Me  ************************************************/

  /* PubSub  *****************************************************/
    
  function PubSub(){
      this._topics = {}
  }

  PubSub.prototype.sub = function sub( topic, fn ){

      var listeners = this._topics[ topic ] || (this._topics[ topic ] = [])

      listeners.push( fn )
  }

  PubSub.prototype.pub = function pub(data){

    var topic = data.topic

    var listeners = this._topics[ topic ]
      , len = listeners.length
      , scope = scope || this
      ;

    if(typeof data !== 'object') data = { data: data }

    data.scope = scope

    for (var i = 0, l = listeners.length; i < l; i++ ){
      listeners[ i ].call( this, data );
    }

  }

  pubsub = new PubSub()

  /* End PubSub  *************************************************/

  
}) // end DOM ready
