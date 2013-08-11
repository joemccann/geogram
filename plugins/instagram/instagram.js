var fs = require('fs')
  , path = require('path')
  , qs = require('querystring')
  , request = require('request')

// TODO: REFECTOR WITH STREAM/NON-BLOCKING
var instagram_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'instagram-config.json'), 'utf-8' ) )

function toUTC(dateString){
  return new Date(dateString).getTime() / 1000
}


Instagram.geogram = {
  executeGeoSearch: function(req,res){

    var lat = req.body.latitude || 40.762485
      , lng = req.body.longitude || -73.997513
      , minTimestamp = toUTC( req.body.minUTC ) || 1375315200
      , maxTimestamp = toUTC( req.body.maxUTC ) || 1375920000
      , distance = req.body.distance || 35

    // console.log(lat + " is the latiude.")
    // console.log(lng + " is the longitude.")
    // console.log(minTimestamp + " is the minUTC.")
    // console.log(maxTimestamp + " is the maxUTC.")
    // console.log(distance + " is the distance.")

    var config = {
      method: 'GET'
      , uri: "https://api.instagram.com/v1/media/search?lat="
              +lat+"&lng="
              +lng+"&client_id="
              +instagram_config.client_id+"&distance="
              +distance+"&min_timestamp="
              +minTimestamp+"&max_timestamp="+maxTimestamp
    }

    return request(config,function(e,r,b){
      if(e){
        return res.status(r.statusCode).send(e.error.message)
      }
      else {
        
        return res.json(b)
      }
    })
  
}

exports.Instagram = Instagram