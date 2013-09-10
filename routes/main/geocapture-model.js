// Create CRUD operations for application users

var path = require('path')
 , colors = require('colors')
 , _ = require('lodash')
 , CouchDB = require(path.resolve(__dirname, '..', '..', 'plugins/couchdb/couchdb.js'))
 , nano = CouchDB
 , geogramdb = nano.db.use('geogram')


/**
 * Constructor
 * @param {String} username, User's username
 * @param {String} id, Unique ID for the document
 * @param {Object} request_params_object, The object from initial search request
 */
function Geocapture(username, id, request_params_object){
  this.type = 'geocapture'
  this.username = username
  this.id = id
  this.request_params_object = request_params_object
  this.geocapturedData = null
}

/**
 * Helper method to serialize our use model.
 * @return {Object}
 */
Geocapture.prototype._serializeToJson = function(){

  var self = this

  return {
      type: this.type
    , username: this.username
    , id: this.id
    , request_params_object: this.request_params_object
  }
}


/**
 * Create a new geocapture document.
 * @param {Object} captureData, the geocaptured data
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.create = function(captureData,cb){
  // Check to see if document exists
  var self = this
  geogramdb.head(self.id, function(err, d, headers) {
    if (err){
      // Doesn't exist, so let's create it.
      console.log("Creating a new geocapture document with id ".yellow 
        + self.id.toString().bold + ". ")

      var doc = self._serializeToJson()
      doc.geocapturedData = captureData

      self.update(doc, self.id, function updateCb(err, body){
        if(err) cb(err)
        else cb(null,body)
      }) 

    }
    else{
      // Does exist
      cb(new Error('Geocapture document already exists.'))
    }
  })

}

/**
 * Fetch a geocapture document by the ID.
 * @param {String} id, ID associated with user account
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.read = function(id,cb){
  geogramdb.get(id, function(err, body) {
    if (err) return cb(err)
    else cb(null,body)
  })  
}

/**
 * Update/write geocapture document.
 * @param {Object} data, the data to be updated
 * @param {String} id, id associated with the geocapture doc
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.update = function(data,id,cb){
  geogramdb.insert(data, id, function(err, body) {
    if(err) cb(err)
    else cb(null,body)
  })
}

/**
 * Delete a geocapture doc by id.
 * @param {String} id, id of doc to be deleted
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.delete = function(id,cb){

  var self = this

  self.read(id, function readCb(err,data){

    if (err) return cb(new Error("User doesn't exist so can't delete."))
    else{
      // Does exist
      geogramdb.destroy(id, data._rev, function(err,data){
        if(err) return cb(err)
        return cb(null,data)
      })
    } // end else
  }) // end read()

} // end delete()


/**
 * Get all geocapture documents.
 * @param {String} type, type of document
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.allDocsByType = function(type,cb){

  geogramdb.view(type, 'all', function viewCb(err, view){
    if(err) return cb(err)
    return cb(null,view)
  }) // end view()

} // end allDocsByType()

/**
 * Get all geocapture documents by a single user.
 * @param {String} type, the type of document
 * @param {String} username, username to search for
 * @param {Function} cb, Callback function to be executed
 */
Geocapture.prototype.allDocsByUsername = function(type,username,cb){

  geogramdb.view(type,'by_username',{key: username}, function viewCb(err, view){
    if(err) return cb(err)
    return cb(null,view)
  }) // end view()

} // end allDocsByUsername()

/**
 * Removes dupes from an array
 * @param {Array} arr, The source array
 * @param {String} docType, The key by witch to 
 */
 Geocapture.prototype.removeDuplicateObjectsFromArray = function(arr,docType){
  return _.map(_.groupBy(arr,function(doc){return doc[docType]}),function(grouped){return grouped[0]})
}

module.exports = Geocapture