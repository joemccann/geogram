require('date-utils')
var _ = require('lo-dash')

/**
 * Constructor
 */
var Jobber = function(mainAppReference, webSocketReference){
  // Required for access to the main app's code. Let's refactor this.
  this.mainAppReference = mainAppReference
  this.webSocketReference = webSocketReference
  this.jobs = []
  this.jobsDocNameInDb = 'jobs'
}


/**
 * Kicks off the jobs process.
 */
Jobber.prototype.initializeJobs = function(){

  console.info("Initializing Jobs...".yellow)

  this.mainAppReference.fetchFromCouch(this.jobsDocNameInDb,function(err,data){
    
    if(err) return console.error(err)

    if(!data.queue.length) return console.info("No jobs to do!".yellow)
    
    // Cycle through jobs, firing them off
    console.info("We have "+data.queue.length+" jobs to do.".red)

    this.jobs = data.queue

    this.processAllJobs()

  }) // end fetchAllJobs()

}

/**
 * Processes all jobs in queue.
 * @param {Function} cb, Callback function to be executed
 */

Jobber.prototype.processAllJobs = function(cb){

  var self = this

  this.queue.forEach(function(el){

    // Make sure job hasn't expired...
    if( !self.isDateInPastUTC(el.maxUTC) ){
      self.processJob(el, function(err,data){
      	if(err) return console.error(err)
      	return console.dir(data)
      })
    }

  }) // end forEach

  cb && cb() 

}


/**
 * Checks to see if a job already exists
 * @param {String} jobId, unique job id
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.doesJobExist = function(jobId,cb){

  this.mainAppReference.fetchFromCouch(this.jobsDocNameInDb,function(err,data){

  	if(!data.queue.length) return false

  	return !!_.where(data.queue, {'jobId': jobId })

  })

}

/**
 * Creates a new job.
 * @param {Object} config, Configuration object with params for job
 * @param {String} uuid, unique job id
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.createJob = function(config,uuid,cb){

	config = {
		jobId: 'someUUID',
		startTime: 'someUTC number',
		endTime: 'someUTC number',
		latitude: 'someLat number',
		longitude: 'someLon number',
		radius: 'some Radius number',
		eventName: 'the name of the event/document',
		method: 'some function'
	}

    // Make sure job isn't in past
    if( self.isDateBeforeToday(el.minUTC) ) return cb(new Error('Start date is in the past.'))
    if( self.isDateBeforeToday(el.maxUTC) ) return cb(new Error('End date is in the past.'))

    // Make sure job start date isn't in past
    if( self.isDateSameAsToday(el.maxUTC) ){
			if( self.isDateSameAsToday(el.minUTC)) return cb(new Error('Start date is before today.'))
			else{
				// Let's do work!
				console.info("This job %s will start and end today.", config.jobId)
				return cb(null, "Not implemented yet.")
			}
		}

    if( self.isDateSameAsToday(el.minUTC) || self.isDateSameAsToday(el.maxUTC) ) return cb(new Error('End date is in the past.'))

		return cb(null, "Not implemented yet.")

}

/**
 * Creates a unique job id.
 * @param {String} str, Unique string of querystring params
 * @return {String} hash, Unique hash
 */
Jobber.prototype.createJob = function(string){
	return new Buffer(str).toString('base64')
}

/**
 * Processes a single job.
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.processJob = function(config,cb){

	/*
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

          return storeInstagramData(clientData.name_of_folder, originalJson)

        } // end inner else

      } // end outer else

    }) // end executeGeoSearch  

  },timer)

}

	*/

}


/**
 * Determines if a date is before today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateBeforeToday = function(utcTime){
  // Grab current time and compare to incoming date
  return Date.compare( new Date(utcTime), Date.today() ) === -1 ? true : false
}    


/**
 * Determines if a date is same as today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateSameAsToday = function(utcTime){
  // Grab current time and compare to incoming date
  return Date.compare( new Date(utcTime), Date.today() ) === 0 ? true : false
}    

/**
 * Determines if a date is after today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateAfterToday = function(utcTime){
  // Grab current time and compare to incoming date
  return Date.compare( new Date(utcTime), Date.today() ) === 1 ? true : false
}   


/**
 * Determines if a date is in the past or not.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateInPastUTC = function(utcTime){
  // Grab current time and compare to incoming date
  return utcTime > (new Date().getTime() / 1000)    
}

/**
 * Returns a Unix Timestamp from a date string.
 * @param {String} dateString, a calendar date in string format
 */
Jobber.prototype.toUTC = function(dateString){
  return new Date(dateString).getTime() / 1000
}

module.exports = Jobber
