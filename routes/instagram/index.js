var path = require('path')
var Geogram = require(
	path.resolve(
		__dirname, '..', '..', 'plugins/instagram/instagram.js'))

var geogram = new Geogram()

exports.search_geo_post = function(req,res){

  if(!req.body.latitude || !req.body.longitude) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. You need a latitude and longitude.")
  }
  
  geogram.executeGeoSearch(req,res,function(err,data){
    if(err) return res.status(500).json(err)
    return res.json(data)  
  })
  
}