var path = require('path')
var Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
  , Downloader = require(path.resolve(__dirname, '..', '..', 'plugins/downloader/downloader.js'))

var geogram = new Geogram()
  , downloader = new Downloader(path.resolve(__dirname, '..', '..', 'public/downloads/'))

exports.search_geo_post = function(req,res){

  if(!req.body.latitude || !req.body.longitude) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. You need a latitude and longitude.")
  }
  
  // Execute the geosearch...
  geogram.executeGeoSearch(req,res,function executeGeoSearchCallback(err,data){
    if(err) return res.status(500).json(err)
    else{
    // Let's download the files
    downloader.downloadSetOfFiles(JSON.parse(data), function(err,data){
      if(err) return console.error(err)
      else console.log(data)
    })
    // And send the response back
    return res.json(data)  
    }  
  }) // end executeGeoSearch
  
}