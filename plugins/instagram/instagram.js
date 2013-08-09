var fs = require('fs')
  , path = require('path')
  , request = require('request')
  , _ = require('lodash')

// TODO: REFECTOR WITH STREAM/NON-BLOCKING
var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

var Instagram = require('instagram-node-lib')

Instagram.set('client_id', instagram_config.client_id)
Instagram.set('client_secret', instagram_config.client_secret)
Instagram.set('redirect_uri', instagram_config.redirect_uri)

function defaultErrorHandler(req,res,errorMessage, errorObject, caller, response){

  if( !_.isObject( errorObject) ){
    console.log('Not an error object')
    console.dir(errorObject)
    return res.status(500).send(errorObject || "Something weird with Instagram API. Try again.")
  }
  console.dir(errorObject)
  var err = errorObject.meta
  var message = err ? err.error_message : (errorMessage ||'Something went awry. Try again.')
  var code = err ? err.code : 500
  return res.status(code).send(message)
  
}

Instagram.geogram = {
  executeGeoSearch: function(req,res){

  	// lat/lon is Mother NY office
    var lat = req.body.latitude || 40.762485
      , lng = req.body.longitude || -73.997513
      , distance = req.body.distance || 5000
    
    console.log(lat + " is the latiude.")
    console.log(lng + " is the longitude.")
    console.log(distance + " is the distance.")

    Instagram.media.search({
      lat: lat, 
      lng: lng, 
      distance: distance,
      error: function(errorMessage, errorObject, caller, response){
        defaultErrorHandler(req,res,errorMessage, errorObject, caller, response)
      },
      complete: function(data,page){
        
        // We are going to push the pagination object
        // as the last item in the data array.
        // IMPORTANT: Client side code should reflect this
        data.push(page)
        // console.dir(data,5)

        return res.json(data)
      } // end complete 
    
    }) // end recent    
  },
  
}

exports.Instagram = Instagram