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

/**
 * Fetches the headers of a couchdb
 * @param {String} docName, The name of the document to be fetched
 * @param {Function} cb, Callback function to be executed
 */
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
 * @param {Function} cb, Callback function to be executed
 */
function stashInCouch(docName,json,cb){
  geogramdb.insert(json, docName, function(err, body) {
    if(err) cb(err)
    else cb(null,body)
  })
}

/**
 * Fetches the json content to couchdb
 * @param {String} docName, The name of the document to be stored
 * @param {Function} cb, Callback function to be executed
 */
function fetchFromCouch(docName,cb){
  geogramdb.get(docName, function(err, body) {
    if (err) return cb(err)
    else cb(null,body)
  })
}

/**
 * Fetches all docs from Couch
 * @param {Function} cb, Callback function to be executed
 */
function fetchAllDocs(cb){

  geogramdb.list(function(err, body) {
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

/**
 * Stores the proper Instagram json data in couchdb
 * @param {String} folderName, The name of the folder/document in couch 
 * @param {Object} json, New json data to be inserted or appended
 * @param {Function} cb, Optional callback 
 */
function storeInstagramData(folderName,json,cb){

  getHeadFromCouch(folderName, function(err){
    // If there's an error, it means there is no doc by that name.
    if(err && err.status_code === 404) {
      // console.error(err)
      return stashInCouch(folderName, json,function(err,data){
        if(cb && err) cb(err)
        cb && cb(null, "Created initial doc in couchdb.")
      })
      
    }

    return fetchFromCouch(folderName, function(err,couchJson){

      console.log('Document name %s already exists.', folderName )
      console.log(json.data.length + " is len of the new json.")
      console.log(couchJson.data.length + " is len of couchdb json.")

      // Merge
      couchJson.data = couchJson.data.concat(json.data)
      console.log(couchJson.data.length + " is len of merged objects.")

      // Remove dupes
      couchJson.data = removeDuplicateObjectsFromArray(couchJson.data,'id')
      console.log(couchJson.data.length + " is len of unique objects.")

      // Store the data
      stashInCouch(folderName, couchJson, function(err,data){
        cb && cb(null,"Updated %s document.", folderName)
      })
      return 

    }) // end fetchFromCouch()

  }) // end getHeadFromCouch()

} // end storeInstagramData()

exports.realtime_search_geo = function(clientData,socket,wsType,cb){

  // Execute it right away, then set interval on grabbing new ones.
  geogram.executeRealTimeGeoSearch(clientData,function(err,data){

    if(err) {
      console.error(err)
      return cb(err)
    }

    var originalJson = JSON.parse(data)

    if (originalJson.meta.code === 400) return cb(originalJson.meta.error_message)

    // Check if data is empty, meaning, no images.
    if(!originalJson.data.length) return cb("No data. Probably a bad request.")
    else{

      // Store the data
      return storeInstagramData(clientData.name_of_folder, originalJson, function(err,data){
        cb && cb(null,originalJson)
        // var uuid = originalJson.data[0].id
        // looper(clientData,uuid,socket,wsType,30000) // 30 seconds
      }) // end storeInstagramData()

    } // else

  }) // end executeGeoSearch

} // end realtime_search_geo()

function looper(clientData,uuid,socket,wsId,timer){

  var self = this
  self.uuid = uuid // set it initially

  console.info("Interval started for ID %s".blue  , self.uuid)

  var inter = setInterval(function (){

    geogram.executeRealTimeGeoSearch(clientData,function(err,data){

      if(err) {
        return console.error(err)
      }

      var originalJson = JSON.parse(data)

      if (originalJson.meta.code === 400) return false

      // Check if data is empty, meaning, no images.
      if(!originalJson.data.length) return false
      else{

        if(originalJson.data[0].id === self.uuid){
          return console.info("IDs are the same so no new photos.".yellow)
        }
        else {
          console.info("IDs are different so we have new photos.".green)
          // update since it is new.
          self.uuid = originalJson.data[0].id 

          if(socket){
            socket.send(JSON.stringify({data:originalJson,type:wsId}))
          }

          return storeInstagramData(clientData.name_of_folder, originalJson, function(err,data){
            if(err) return console.error(err)
              return console.dir(data)
          })

        } // end inner else

      } // end outer else

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

    if (originalJson.meta.code === 400) return res.status(400).send(originalJson.meta.error_message)

    // Check if data is empty, meaning, no images.
    if(!originalJson.data.length) return res.status(400).send("No data. Probably a bad request.")
    else res.json(data) 

    // Store the data
    storeInstagramData(req, req.body.name_of_folder, originalJson, function(){
      startInterval(req,originalJson,30000) // 30 seconds
    })

  }) // end executeGeoSearch
  
} // end search_geo_post route

exports.getHeadFromCouch = getHeadFromCouch

exports.stashInCouch = stashInCouch

exports.fetchFromCouch = fetchFromCouch

exports.fetchAllDocs = fetchAllDocs