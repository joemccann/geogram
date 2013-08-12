var path = require('path')
  , colors = require('colors')
  , Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
  , Downloader = require(path.resolve(__dirname, '..', '..', 'plugins/downloader/downloader.js'))
  , LevelDB = require(path.resolve(__dirname, '..', '..', 'plugins/leveldb/leveldb.js'))

var geogram = new Geogram()
  , downloader = new Downloader(path.resolve(__dirname, '..', '..', 'public/downloads/'))
  , leveldb = LevelDB

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

        stashInLevelDb(req, currentData)

        downloader.downloadSetOfFiles(currentData, req.body.name_of_folder, function(err,data){
         if(err) return console.error(err)
         else console.log(data)
        }) // end dowloadSetOfFiles

      }

    }) // end executeGeoSearch 

  },timer)

}

// keep track of all keys
function updateKeysCollection(key){

  leveldb.get("ALL_KEYS", {encoding: 'json'}, function (err, value) {
    if(err){
        // Doesn't exist so create it
        var keysArr = []
        keysArr.push(key)
        leveldb.put('ALL_KEYS', keysArr, {encoding: 'json'}, function(err){
          if(err) console.log('Ooops!', err) // likely the key was not found
          else console.info("put keysArr init")
        }) // end put
      }else{
        var arr = value
        arr.push(key)
        leveldb.put('ALL_KEYS', arr, {encoding: 'json'}, function(err){
          if(err) console.log('Ooops!', err) // likely the key was not found
          else console.info("appending to arr")
        }) // end put
      }
    }) // end get

} // end updateKeysCollection

function stashInLevelDb(req, originalJson){

    var leveldbKey = req.body.name_of_folder + "_" + originalJson.data[0].id

    // console.log(leveldbKey + " is the leveldbkey")

    updateKeysCollection(leveldbKey)

    leveldb.put(leveldbKey, originalJson, {encoding: 'json' }, function (err) {
      if (err) return console.log('Ooops!', err) // some kind of I/O error

      leveldb.get(leveldbKey, {encoding: 'json' }, function (err, value) {
        if (err) return console.log('Ooops!', err) // likely the key was not found
        // console.dir(value)
        console.log('finished fetching...')
      }) // end get
    }) // end put

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


    /********** either download or store in db or something here ****************/  
    
    // Stash in LevelDB
    stashInLevelDb(req, originalJson)

    // Download initial set
    downloader.downloadSetOfFiles(originalJson, req.body.name_of_folder, function(err,data){
      if(err) return console.error(err)
      else {
        console.log(data)
        // TODO: IF THIS IS FOR A DATE IN THE PAST, THEN NO NEED FOR INTERVAL
        startInterval(req,originalJson,30000) // 30 seconds
      }
    }) // end downloadSetOfFiles

  }) // end executeGeoSearch
  
} // end search_geo_post route