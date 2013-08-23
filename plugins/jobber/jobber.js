require('date-utils')

var _ = require('lodash')
  , crypto = require('crypto')
  ;

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

  var self = this

  console.info("Initializing Jobs...".yellow)

  self.mainAppReference.fetchFromCouch(self.jobsDocNameInDb,function(err,data){
    
    if(err) return console.error(err)

    if(!data.queue.length) return console.info("\nNo jobs to do!".yellow)
    
    // Cycle through jobs, firing them off
    console.info("We have ".red +data.queue.length+" jobs to do.".red)

    self.jobs = data.queue

    self.processAllJobs()

  }) // end fetchAllJobs()

}

/**
 * Processes all jobs in queue.
 * @param {Function} cb, Callback function to be executed
 */

Jobber.prototype.processAllJobs = function(cb){

  var self = this

  self.jobs.forEach(function(el){

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

  this.mainAppReference.fetchFromCouch(this.jobsDocNameInDb,function fetchFromCouchCb(err,data){

    if(err) return cb(err)

    if( (_.where(data.queue, {'jobId': jobId })).length ) return cb(new Error("Job already exists."))

    else return cb(null)

  })

}

/**
 * Creates a new job.  Does a bit of time/date checking to validate job
 * Instagram currently doesn't allow us to run jobs in the past (only returns
 * 20 images for geofenced searches in the past).
 * @param {Object} config, Configuration object with params for job
 * @param {String} uuid, unique job id
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.createJob = function(config,uuid,cb){

  var self = this

  // console.dir(config)
/*
{ timezoneOffset: '4',
  address: '',
  name_of_folder: 'debug',
  distance: '500',
  latitude: '40.7142786',
  longitude: '-74.010086',
  minUTC: '2013-08-23',
  maxUTC: '2013-08-24' }
  */

    config.timezoneOffset = parseInt(config.timezoneOffset) // Just because I'm paranoid

    // Make sure job isn't in past
    if( self.isDateBeforeToday(config.minUTC,config.timezoneOffset) ) return cb(new Error('Start date is in the past.'))
    if( self.isDateBeforeToday(config.maxUTC,config.timezoneOffset) ) return cb(new Error('End date is in the past.'))

    // Make sure job end date isn't in past
    if( self.isDateSameAsToday(config.maxUTC,config.timezoneOffset) ){
			if( self.isDateSameAsToday(config.minUTC,config.timezoneOffset)) 
        return cb(new Error('Start date and end dates are same.'))
			else{
				// Let's do work!
				console.info("This job %s will start and end today.", uuid)
				return cb(null, "Not implemented yet.")
			}
		}

		return cb(null, "Not implemented yet but at the end.")

}

Jobber.prototype.addJobToDb = function(config,uuid,cb){

  var self = this

  // Fetch the jobs queue doc from couch

  self.mainAppReference.fetchFromCouch(self.jobsDocNameInDb,function(err,data){
    
    if(err) return cb(err)

    // add uuid to config object
    config.jobId = uuid

    // push it into the queue
    data.queue.push(config)

    // Now stash it in the couch
    self.mainAppReference.stashInCouch(self.jobsDocNameInDb,data,function(err,body){
      
      if(err) return cb(err)
      return cb(null,body)

    }) // end fetchAllJobs()


  }) // end fetchAllJobs()

}

/**
 * Creates a unique job id.
 * @param {String} str, Unique string of querystring params
 * @return {String} hash, Unique hash
 */
Jobber.prototype.createUniqueJobId = function(str){
  var sum = crypto.createHash('md5')
  sum.update(str)
  return sum.digest('hex')
}

/**
 * Processes a single job.
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.processJob = function(config,cb){

console.warn("proccesJob not implemented yet")

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
Jobber.prototype.isDateBeforeToday = function(utcTime,utcOffset){
  // Grab current time and compare to incoming date
  // console.log(new Date(utcTime))
  // console.log(Date.today())
  var today = Date.today()
  // We make negative because getTimezoneOffset() in browser will return
  // positive number if behind UTC mean time
  today.addHours(-utcOffset) 
  // console.log(today)

  return Date.compare( new Date(utcTime), today ) === -1 ? true : false
}    


/**
 * Determines if a date is same as today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateSameAsToday = function(utcTime, utcOffset){

  var today = Date.today()
  // We make negative because getTimezoneOffset() in browser will return
  // positive number if behind UTC mean time
  today.addHours(-utcOffset) 

  return Date.compare( new Date(utcTime), today ) === 0 ? true : false
}    

/**
 * Determines if a date is after today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateAfterToday = function(utcTime,utcOffset){
  // Grab current time and compare to incoming date

  var today = Date.today()
  // We make negative because getTimezoneOffset() in browser will return
  // positive number if behind UTC mean time
  today.addHours(-utcOffset) 

  return Date.compare( new Date(utcTime), today ) === 1 ? true : false
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
