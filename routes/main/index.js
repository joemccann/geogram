var path = require('path')
  , colors = require('colors')
  , fs = require('fs')
  , _ = require('lodash')
  , Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
  , CouchDB = require(path.resolve(__dirname, '..', '..', 'plugins/couchdb/couchdb.js'))
  , Looper = require(path.resolve(__dirname, './looper.js')).Looper
  , looperJobIds = Looper.looperJobIds
  , nano = CouchDB
  , geogramdb = nano.db.use('geogram')
  , geogram = new Geogram()
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
  console.log('Stashing '+docName+ ' in couch...')
  geogramdb.insert(json, docName, function(err, body) {
    if(err) cb(err)
    else cb(null,body)
  })
}

/**
 * Fetches the json content from couchdb
 * @param {String} docName, The name of the document to be stored
 * @param {Function} cb, Callback function to be executed
 */
function fetchDocFromCouch(docName,cb){
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
 * @param {String} username, The name of the folder/document in couch 
 * @param {Object} json, New json data to be inserted or appended
 * @param {Function} cb, Optional callback 
 */
function storeUserInstagramData(username,json,cb){

  getHeadFromCouch(username, function getHeadFromCouchCb(err){
    // If there's an error, it means there is no doc by that name.
    if(err && err.status_code === 404) {
      // console.error(err)
      return stashInCouch(username, json,function(err,data){
        if(cb && err) cb(err)
        cb && cb(null, "Created initial doc in couchdb.")
      })
      
    }

    return fetchDocFromCouch(username, function(err,couchJson){

      console.log('Document name %s already exists.', username )
      console.log(json.data.length + " is len of the new json.")

      // Merge
      couchJson.data = couchJson.data.concat(json.data)

      // Remove dupes
      couchJson.data = removeDuplicateObjectsFromArray(couchJson.data,'id')
      console.log(couchJson.data.length + " is length of unique objects.")

      // Store the data
      stashInCouch(username, couchJson, function(err,data){
        if(err){
          console.error(err)
          return cb && cb(err)
        }
        return cb && cb(null,"Updated "+username+" document.")
      })
      return 

    }) // end fetchDocFromCouch()

  }) // end getHeadFromCouch()

} // end storeUserInstagramData()

exports.realtime_search_geo = function(clientData,jobId,socket,cb){

  console.dir(clientData)

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
      return storeUserInstagramData(clientData.name_of_folder, originalJson, 
        function storeUserInstagramDataCb(err,data){
          cb && cb(null,originalJson)
          return (new Looper(clientData,jobId,socket,30000,clientData.maxUTC)).executeLoop()
      }) // end storeUserInstagramData()

    } // else

  }) // end executeGeoSearch

} // end realtime_search_geo()

exports.getHeadFromCouch = getHeadFromCouch

exports.stashInCouch = stashInCouch

exports.fetchDocFromCouch = fetchDocFromCouch

exports.fetchAllDocs = fetchAllDocs

exports.storeUserInstagramData = storeUserInstagramData