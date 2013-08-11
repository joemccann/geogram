var path = require('path')
  , colors = require('colors')
var Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
  , Downloader = require(path.resolve(__dirname, '..', '..', 'plugins/downloader/downloader.js'))

var geogram = new Geogram()
  , downloader = new Downloader(path.resolve(__dirname, '..', '..', 'public/downloads/'))


// req gives us the POST params
// data gives us the id
// timer is duration
function startInterval(req,data,timer){

  var parsedData = data
    , currentId = parsedData.data[0].id // set it initially

  console.info("Interval started...")

  var inter = setInterval(function(){

    // Execute it right away, then set interval on grabbing new ones.
    geogram.executeGeoSearch(req,null,function(err,data){

      if(err){
        // TODO: EMAIL ME SHIT IS DOWN
        return console.error(err)
      }

      var currentData = JSON.parse(data)

      if(currentData.data[0].id === currentId){
        console.info("currentId is the same so no new photos.")
        console.log(currentData.data[0].id + " is from live data")
        console.log(currentId + " is the last ID")
        return false
      }
      else {
        console.info("New ID so we have new photos.".green)
        currentId = currentData.data[0].id // update if new
        downloader.downloadSetOfFiles(currentData, function(err,data){
         if(err) return console.error(err)
         else console.log(data)
        }) // end dowloadSetOfFiles
      }

    }) // end executeGeoSearch 

  },timer)

}

exports.search_geo_post = function(req,res){

  if(!req.body.latitude || !req.body.longitude) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. You need a latitude and longitude.")
  }

  // Execute it right away, then set interval on grabbing new ones.
  geogram.executeGeoSearch(req,res,function(err,data){

    if(err) {
      console.error(err)
      return res.status(500).json(err)
    }

    var originalJson = JSON.parse(data)

    // Check if data is empty, meaning, no images.
    if(!originalJson.data.length) return res.status(400).send("No data. Probably a bad request.")
    else res.json(data) 
    
    // Download initial set
    downloader.downloadSetOfFiles(originalJson, function(err,data){
      if(err) return console.error(err)
      else {
        console.log(data)
        // TODO: IF THIS IS FOR A DATE IN THE PAST, THEN NO NEED FOR INTERVAL
        startInterval(req,originalJson,15000)
      }
    }) // end downloadSetOfFiles

  }) // end executeGeoSearch
  
  
}