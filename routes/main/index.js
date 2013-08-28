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
        cb && cb(null,"Updated "+folderName+" document.")
      })
      return 

    }) // end fetchFromCouch()

  }) // end getHeadFromCouch()

} // end storeInstagramData()

exports.realtime_search_geo = function(clientData,jobId,socket,cb){

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
      return storeInstagramData(clientData.name_of_folder, originalJson, 
        function storeInstagramDataCb(err,data){
          cb && cb(null,originalJson)
          return (new Looper(clientData,jobId,socket,10000)).executeLoop()
      }) // end storeInstagramData()

    } // else

  }) // end executeGeoSearch

} // end realtime_search_geo()


var looperJobIds = {}


function removeLooperById(id){
  console.log('removing looper id '+ id)
  delete looperJobIds[id]
}

function Looper(clientData,jobId,socket,timer,killDate){
  this.clientData = clientData
  this.jobId = jobId
  this.socket = socket
  this.timer = timer
  this.killDate = killDate || null

  looperJobIds[jobId] = true
}

/**
 * Determines if a date is in the past or not.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Looper.prototype.isDateInPastUTC = function(utcTime){
  // Grab current time and compare to incoming date
  return utcTime > (new Date().getTime() / 1000)    
}

Looper.prototype.executeLoop = function(jobOnCompleteCb){

  var self = this

  console.info("Interval started for ID %s".blue  , self.jobId)

  var inter = setInterval(function(){

    // Let's check to see if this jobId is still valid
    if(typeof looperJobIds[self.jobId] == 'undefined'){
      // Then the job was killed
      console.log("Clearing interval for " +self.jobId)
      return clearInterval(inter)
    }

        // Let's check to see if this jobId is still valid
    if(self.isDateInPastUTC(self.killDate)){
      // Then the job was killed
      console.log("Date is in the past for job " +self.jobId)
      console.log("Clearing interval for " +self.jobId)
      removeLooperById(self.jobId)
      jobOnCompleteCb && jobOnCompleteCb()
      return
    }

    geogram.executeRealTimeGeoSearch(self.clientData,function(err,data){

      if(err) {
        return console.error(err)
      }

      if(data.charAt(0) == '<'){
        console.log(data)
        console.log("Instagram API returned a block of HTML.".red)
        return false
      }

      var originalJson = JSON.parse(data)

      // console.dir(originalJson)

      if (originalJson.meta.code > 399){
        console.warn("Instagram API returned a ".yellow+ originalJson.meta.code.yellow)
        return false
      }

      // Check if data is empty, meaning, no images.
      if(!originalJson.data.length){
        console.warn("No images returned from Instagram API call.".yellow)
        return false
      }
      else{

        if(originalJson.data[0].id === self.uuid){
          return console.info("IDs are the same so no new photos.".yellow)
        }
        else {
          console.info("IDs are different so we have new photos.".green)
          // update since it is new.
          self.uuid = originalJson.data[0].id 

          if(self.socket){
            self.socket.emit('geosearch-response',{data:originalJson, jobId:self.jobId})
          }

          return storeInstagramData(self.clientData.name_of_folder, originalJson, function(err,data){
            if(err) return console.error(err)
              return console.dir(data)
          })

        } // end inner else

      } // end outer else

    }) // end executeGeoSearch  

  },self.timer)


}

exports.Looper = Looper


exports.removeLooperById = removeLooperById


exports.getHeadFromCouch = getHeadFromCouch

exports.stashInCouch = stashInCouch

exports.fetchFromCouch = fetchFromCouch

exports.fetchAllDocs = fetchAllDocs