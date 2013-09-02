var path = require('path')
  , colors = require('colors')
	,	Geogram = require(path.resolve(__dirname, '..', '..', 'plugins/instagram/instagram.js'))
	, geogram = new Geogram()
	, mainApp = require(path.resolve(__dirname, './index.js'))
	;

var GeocaptureModel = require(path.resolve(__dirname,'./geocapture-model.js'))


// We need a global LooperIds object, not per instance

var looperJobIds = {}

/**
 * Constructor
 * @param {Object} clientData, Hash of parameters that are used
 * 														 when constructing Instagram request
 * @param {String} jobId, The unique ID for the job to be looped
 * @param {Socket} socket, optional websocket to emit to
 * @param {Number} timer, number of milliseconds for interval
 * @param {Number} killdate, UTC timestamp of when to stop the interval 
 */
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
  return utcTime < (new Date().getTime() / 1000)    
}

/**
 * Specific set of instructions to be executed over a fixe interval.
 * @param {Function} looperSuccesCb, gets fired on each successful loop
 * @param {Function} jobOnCompleteCb, optional callback
 */
Looper.prototype.executeLoop = function(looperSuccesCb,jobOnCompleteCb){

  var self = this

  console.info("Interval started for ID %s".blue  , self.jobId)

  var inter = setInterval(function(){

    // Let's check to see if this jobId is still valid
    if(typeof looperJobIds[self.jobId] == 'undefined'){
      // Then the job was killed
      console.log("jobId is undefined, meaning, no longer in global hash, for ID " +self.jobId)
      console.log("Clearing interval for " +self.jobId)
      return ( inter && clearInterval(inter) )
    }

    // Let's check to see if this jobId is still valid
    if(self.killDate && self.isDateInPastUTC(self.killDate)){
      // Then the job was killed
      console.log("Date is in the past for job " +self.jobId)
      console.log("Clearing interval for " +self.jobId)
      removeLooperById(self.jobId)
      jobOnCompleteCb && jobOnCompleteCb()
      return ( inter && clearInterval(inter) )
    }

    // Execute the search...
    geogram.executeRealTimeGeoSearch(self.clientData,
    	function executeRealTimeGeoSearchCb(err,data){

      if(err) {
        console.error(err)
        return false
      }

      if(data.charAt(0) == '<'){
        console.log(data)
        console.log("Instagram API returned a block of HTML.".red)
        return false
      }

      var parsedJson = JSON.parse(data)

      // console.dir(parsedJson)

      if (parsedJson.meta.code > 399){
        console.warn("Instagram API returned a ".yellow+ parsedJson.meta.code.yellow)
        return false
      }

      // Check if data is empty, meaning, no images.
      if(!parsedJson.data.length){
        console.warn("No images returned from Instagram API call.".yellow)
        return false
      }
      else{

        if(parsedJson.data[0].id === self.uuid){
          return console.info("IDs are the same so no new photos.".yellow)
        }
        else {
          console.info("IDs are different so we have new photos.".green)
          // update since it is new.
          self.uuid = parsedJson.data[0].id 

          if(self.socket){
            self.socket.emit('geosearch-response',{data:parsedJson, jobId:self.jobId})
          }

          var geo = new GeocaptureModel(self.clientData.userprefix, self.jobId, self.clientData)

          // TODO: FIRST, READ THE LATEST, THEN ADD TO IT.
          return geo.read(self.jobId,function readCb(err,data){

            if(err) return cb(err)

            var currentData = data
            console.log(currentData.geocapturedData.length + " is current data length.")  

            // Merge
            currentData.geocapturedData = currentData.geocapturedData.concat(parsedJson.data)

            // Remove dupes
            currentData.geocapturedData = geo.removeDuplicateObjectsFromArray(currentData.geocapturedData,'id')
            console.log(currentData.geocapturedData.length + " is length of unique objects.")

            geo.update(currentData, self.jobId, function updateCb(err,data){
            if(err) return console.error(err)
              return console.log(data.ok ? "Update was successful.".green : "Update was a failure.".red)
            }) // end update

          }) // end read

          // return mainApp.storeUserInstagramData(self.clientData.name_of_folder, parsedJson, function(err,data){
          //   if(err) return console.error(err)
          //     return console.dir(data)
          // })

        } // end inner else

      } // end outer else

    }) // end executeGeoSearch  

  },self.timer) // end setInterval()

}

function removeLooperById(id){
  console.log('Removing looper id '+ id)
  delete looperJobIds[id]
}

exports.looperJobIds = looperJobIds

exports.removeLooperById = removeLooperById

exports.Looper = Looper