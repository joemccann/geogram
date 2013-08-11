var fs = require('fs')
  , path = require('path')
  , qs = require('querystring')
  , request = require('request')

// TODO: REFECTOR WITH STREAM/NON-BLOCKING
var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )


/**
 * Constructor
 */
var Geogram = function(){}

/**
 * Returns a Unix Timestamp for a date string.
 * @param {String} dateString, a calendar date in string format
 */
Geogram.prototype._toUTC = function(dateString){
  return new Date(dateString).getTime() / 1000
}

/**
 * Returns a string that is the geo-search URL
 * @param {String} lat, the latitude to search
 * @param {String} lng, the longitude to search
 * @param {String} minTimestamp, the beginning of the duration as a Unix Timestamp
 * @param {String} maxTimestamp, the end of the duration as a Unix Timestamp
 * @param {String} distance, the radius to search in meters
 */
Geogram.prototype._buildGeoSearchUri = function(lat,lng,minTimestamp,maxTimestamp,distance){
  return "https://api.instagram.com/v1/media/search?lat="
            +lat+"&lng="
            +lng+"&client_id="
            +instagram_config.client_id+"&distance="
            +distance+"&min_timestamp="
            +minTimestamp+"&max_timestamp="+maxTimestamp
}


/**
 * Executes a geo-location instagram search
 * @param {Request Object} req, the incoming request object
 * @param {Request Object} req, the outgoing response object
 * @param {Function} cb, callback to be executed
 */
Geogram.prototype.executeGeoSearch = function(req,res,cb){
  var lat = req.body.latitude || 40.762485
    , lng = req.body.longitude || -73.997513
    , minTimestamp = this._toUTC( req.body.minUTC ) || 1375315200
    , maxTimestamp = this._toUTC( req.body.maxUTC ) || 1375920000
    , distance = req.body.distance || 35

  // console.log(lat + " is the latiude.")
  // console.log(lng + " is the longitude.")
  // console.log(minTimestamp + " is the minUTC.")
  // console.log(maxTimestamp + " is the maxUTC.")
  // console.log(distance + " is the distance.")

  var config = {
    method: 'GET'
    , uri: this._buildGeoSearchUri(lat,lng,minTimestamp,maxTimestamp,distance)
  }

  return request(config,function(error,response,body){
    if(error){
      console.error(e)
      return cb(e)
    }
    else {
      cb(null,body)
    }
  })
}


module.exports = Geogram