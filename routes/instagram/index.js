var path = require('path')
  , colors = require('colors')
  , fs = require('fs')
  , _ = require('lodash')
  , Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
  , Downloader = require(path.resolve(__dirname, '..', '..', 'plugins/downloader/downloader.js'))
  , Stasher = require(path.resolve(__dirname, '..', '..', 'plugins/stasher/stasher.js'))
  , CouchDB = require(path.resolve(__dirname, '..', '..', 'plugins/couchdb/couchdb.js'))
  ;

var geogram = new Geogram()
  , downloader = new Downloader(path.resolve(__dirname, '..', '..', 'public/downloads/'))
  , stasher = new Stasher(path.resolve(__dirname,'..','..','public/stash/'))
  , nano = CouchDB
  , geogramdb = nano.db.use('geogram')
  ;

function getHeadFromCouch(docName,cb){
  geogramdb.head(docName, function(err, d, headers) {
    if (err){
      // Doesn't exist
      cb(err)
    }
    else{
      // Does exist
      cb(null)
    }
  })
}

/**
 * Writes the json content to couchdb
 * @param {String} docName, The name of the document to be stored
 * @param {String} json, The data to be written, in JSON format
 */
function stashInCouch(docName,json){
  geogramdb.insert(json, docName, function(err, body) {
    if(err) console.error(err)
    else console.log("Stashed a document in CouchDB successfully.")
  })
}

/**
 * Fetches the json content to couchdb
 * @param {String} docName, The name of the document to be stored
 */
function fetchFromCouch(docName,cb){
  geogramdb.get(docName, function(err, body) {
    if (err) return cb(err)
    else cb(null,body)
  })
}


/**
 * Removes dupes from an array
 * @param {Array} arr, The source array
 * @param {String} docType, The key by witch to 
 */
 function removeDuplicateObjectsFromArray(arr,docType){
  return _.map(_.groupBy(arr,function(doc){return doc[docType]}),function(grouped){return grouped[0]})
}


// req gives us the POST params
// data gives us the id
// timer is duration
function startInterval(req,data,timer){

  var parsedData = data
    , currentId = parsedData.data[0].id // set it initially

  console.info("Interval started...")

  // Kick of the interval
  var inter = setInterval(function(){

    // Execute it right away, then set interval on grabbing new ones.
    geogram.executeGeoSearch(req,null,function(err,data){

      if(err){
        // TODO: EMAIL ME SHIT IS DOWN
        console.info("Error coming from geosearch.".yellow)
        return console.error(err)
      }

      var originalJson = JSON.parse(data)

      if(originalJson.data[0].id === currentId){
        console.info("currentId is the same so no new photos.")
        console.log(originalJson.data[0].id + " is from live data")
        console.log(currentId + " is the last ID")
        return false
      }
      else {
        console.info("New ID so we have new photos.".green)
        // update since it is new.
        currentId = originalJson.data[0].id 

        return storeInstagramData(req, req.body.name_of_folder, originalJson)

      } // end else

    }) // end executeGeoSearch 

  },timer)

}

/**
 * Stores the proper json data in couchdb
 * @param {Object} req, Incoming request object
 * @param {String} folderName, The name of the folder/document in couch 
 * @param {Object} originalJson, New json data to be inserted or appended
 * @param {Function} cb, Optional callback 
 */
function storeInstagramData(req,folderName,originalJson,cb){

  getHeadFromCouch(folderName, function(err){
    // If there's an error, it means there is no doc by that name.
    if(err && err.status_code === 404) {
      // console.error(err)
      stashInCouch(folderName, originalJson)
      cb && cb()
      return
    }

    return fetchFromCouch(folderName, function(err,couchJson){

      console.log('Document name %s already exists.', folderName )

      console.log(originalJson.data.length + " is len of original json.")
      console.log(couchJson.data.length + " is len of couch json.")

      // Merge
      couchJson.data = couchJson.data.concat(originalJson.data)

      console.log(couchJson.data.length + " is len of merged objects.")

      // Remove dupes
      couchJson.data = removeDuplicateObjectsFromArray(couchJson.data,'id')

      console.log(couchJson.data.length + " is len of unique objects.")

      // Store the data
      stashInCouch(folderName, couchJson)
      cb && cb()
      return 

    }) // end fetchFromCouch()

  }) // end getHeadFromCouch()

} // end storeInstagramData()


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

    // Store the data
    storeInstagramData(req, req.body.name_of_folder, originalJson, function(){
      startInterval(req,originalJson,30000) // 30 seconds
    })

  }) // end executeGeoSearch
  
} // end search_geo_post route