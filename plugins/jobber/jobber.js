var dateUtils = require('date-utils')
  , _ = require('lodash')
  , colors = require('colors')
  , path = require('path')
  , crypto = require('crypto')
  , Looper = require(path.resolve(__dirname, '../../', 'routes/main/looper.js')).Looper
  , cronJob = require('cron').CronJob
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

  self.mainAppReference.fetchDocFromCouch(self.jobsDocNameInDb,function(err,data){
    
    if(err) return console.error(err)

    if(!data.queue.length) return console.info("\nNo jobs to do!".yellow)

    // Remove old jobs...
    self.removeOldJobsFromDb(function(err,removalData){
      if(err) return console.error(err)
      else console.log(removalData)

      // Cycle through jobs, firing them off
      console.info("We have ".red +data.queue.length+" jobs to do.".red)

      self.jobs = data.queue

      self.processAllJobs()

    }) // end fetchDocFromCouch()
    

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

  this.mainAppReference.fetchDocFromCouch(this.jobsDocNameInDb,function fetchFromCouchCb(err,data){

    if(err) return cb(err)

    if( (_.where(data.queue, {'jobId': jobId })).length ) 
      return cb(new Error("Job already exists."))

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

  console.dir(config)
/*
   { timezoneOffset: '4',
     localTimezone: 'America/New_York',
     userprefix: 'joemccann',
     address: '',
     name_of_folder: 'joemccann:debug',
     distance: '500',
     latitude: '40.762442',
     longitude: '-73.9975228',
     minUTC: '1377561600',
     maxUTC: '1377734400' }  
*/

  config.timezoneOffset = parseInt(config.timezoneOffset) // Just because I'm paranoid

  // Make sure job isn't in past
  if( self.isDateInPastUTC(config.minUTC) ) return cb(new Error('Start date is in the past.'))
  if( self.isDateInPastUTC(config.maxUTC) ) return cb(new Error('End date is in the past.'))

	return cb(null, "Not implemented yet but at the end.")

}

Jobber.prototype.addJobToDb = function(config,uuid,cb){

  var self = this

  // Fetch the jobs queue doc from couch

  self.mainAppReference.fetchDocFromCouch(self.jobsDocNameInDb,function(err,data){
    
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
 * Removes expired job sfrom the jobs document in the Database.
 * @param {Function} cb, Callback function to be executed
 */

Jobber.prototype.removeOldJobsFromDb = function(cb){

  var self = this

  // Fetch the jobs queue doc from couch

  self.mainAppReference.fetchDocFromCouch(self.jobsDocNameInDb,function(err,data){
    
    if(err) return cb && cb(err)

    data.queue.forEach(function(el,i){
      if(el.data.maxUTC && self.isDateInPastUTC(el.data.maxUTC)){
        console.log('Removing expried job '+el.uuid+' from Database.'.yellow)
        data.queue[i] = null
      }
    })

    // remove falsey values.
    data.queue = _.compact(data.queue)

    // Now stash it in the couch
    self.mainAppReference.stashInCouch(self.jobsDocNameInDb,data,function(err,body){
      
      if(err) return cb(err)
      return cb(null,body)

    }) // end stashInCouch()
  
  }) // end fetchDocFromCouch()

}

/**
 * Creates a unique job id.
 * @param {String} str, Unique string of querystring params
 * @return {String}
 */
Jobber.prototype.createUniqueJobId = function(str){
  var sum = crypto.createHash('md5')
  sum.update(str)
  return sum.digest('hex')
}

/**
 * Returns a date object from now plus a few seconds in the future.
 * @param {Number} seconds, Number of seconds in the future
 * @return {Date Object}
 */
Jobber.prototype.createDateObjectNowPlusSeconds = function(seconds){
  var d = new Date()
  return d.add({seconds: seconds}) 
}

/**
 * Processes a single job.
 * @param {Function} cb, Callback function to be executed
 */
Jobber.prototype.processJob = function(config,looper,cb){

  console.log("proccesJob kicking off")

  // console.dir(config)

  var timeZone = config.data.localTimezone
    , startDate = this.createDateObjectWithAddedHours(parseInt(config.data.minUTC)
                , parseInt(config.data.timezoneOffset))
    , killDate = this.createDateObjectWithAddedHours(parseInt(config.data.maxUTC)
                , parseInt(config.data.timezoneOffset))
    , _looper = new Looper(config.data,config.jobId,null,30000,killDate)

  // Is startDate same as today's date?
  if(startDate.toDateString() == Date.today().toDateString()){

    // for the cron job, we have to set it to a new date if the 
    // dates are actually the same and add a few seconds to queue
    // it up
    startDate = this.createDateObjectNowPlusSeconds(3)

  } 

  // If startDate is in the past, but killDate is in the future, we
  // we still need to restart the job until it is complete.
  if(this.isDateInFutureUTC(this.toUTC(killDate))){
    startDate = this.createDateObjectNowPlusSeconds(3)
  }


  // cronTime, onTick, onComplete, start, timezone, context
  var job = new cronJob(startDate, function cronJobStart(){

    // run the looper here

    console.log("cronJobStart...".green)

    _looper.executeLoop(function looperIsFinished(){
      // remove from database
      console.warn("Remove from DB not implemented")

      // zip up images and json and email link
      console.warn("zip up images and json not implemented")

      job = null
      delete job

    })


    }, function cronJobComplete(){
      console.log("cronJobComplete called.")
    }, 
    true,
    timeZone
  )

  return

}


/**
 * Determines if a date is before today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateBeforeToday = function(utcTime,utcOffset){}    


/**
 * Determines if a date is same as today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateSameAsToday = function(utcTime, utcOffset){}    

/**
 * Determines if a date is after today.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateAfterToday = function(utcTime,utcOffset){}   


/**
 * Determines if a date is in the past or not.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateInPastUTC = function(utcTime){
  // Grab current time and compare to incoming date
  return utcTime < (new Date().getTime() / 1000)    
}

/**
 * Determines if a date is in the future or not.
 * @param {Number} utcTime, Unix Timestamp to be compared against
 * @return {Boolean}
 */
Jobber.prototype.isDateInFutureUTC = function(utcTime){
  // Grab current time and compare to incoming date
  return utcTime > (new Date().getTime() / 1000)    
}


/**
 * Returns a Unix Timestamp from a date string.
 * @param {String} dateString, a calendar date in string format
 * @return {Number}
 */
Jobber.prototype.toUTC = function(dateString){
  return new Date(dateString).getTime() / 1000
}

/**
 * Returns a date object from a UTC string.
 * @param {Number} utc, a calendar date in string format
 * @return {Date}
 */
Jobber.prototype.toDateFromUTC = function(utc){
  return new Date( (new Date(0)).setUTCSeconds(utc) )
}

/**
 * Returns a UTC string with the number of hours added to it.
 * @param {Number} utc, a calendar date in string format
 * @param {Number} offset, number of hours offset (positive is negative GMT)
 * @return {Date}
 */
Jobber.prototype.createDateObjectWithAddedHours = function(utc, offset){
  var d = this.toDateFromUTC(utc)
  d = d.add({hours: offset})
  return new Date( (new Date(0)).setUTCSeconds(this.toUTC(d)) )
}

module.exports = Jobber
