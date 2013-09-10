// Create CRUD operations for application users

var path = require('path')
 , colors = require('colors')
 , CouchDB = require(path.resolve(__dirname, '..', '..', 'plugins/couchdb/couchdb.js'))
 , nano = CouchDB
 , geogramdb = nano.db.use('geogram')


/**
 * Constructor
 * @param {Object} userdata, Data object from Instagram
 */
function User(userdata){
  this.type = 'user'
  this.username = userdata.username
  this.profile_picture = userdata.profile_picture
  this.full_name = userdata.full_name
  this.instagram_user_id = userdata.id
}

/**
 * Helper method to serialize our use model.
 * @return {Object}
 */
User.prototype._serializeToJson = function(){
  return {
      type: this.type
    , username: this.username
    , profile_picture: this.profile_picture
    , full_name : this.full_name
    , instagram_user_id : this.instagram_user_id 
  }
}


/**
 * Create a new user.
 * @param {Function} cb, Callback function to be executed
 */
User.prototype.create = function(cb){
  // Check to see if user exists
  var self = this
  geogramdb.head(self.username, function(err, d, headers) {
    if (err){
      // Doesn't exist, so let's create it.
      console.log("Creating a new user with username ".yellow 
        + self.username.toString().bold + ". ")
      
      self.update(self._serializeToJson(), self.username, function updateCb(err, body){
        if(err) cb(err)
        else cb(null,body)
      }) 

    }
    else{
      // Does exist
      cb(new Error('User already exists.'))
    }
  })

}

/**
 * Fetch a user's info by the username.
 * @param {String} username, username associated with user account
 * @param {Function} cb, Callback function to be executed
 */
User.prototype.read = function(username,cb){
  geogramdb.get(username, function readCb(err, body) {
    if (err) return cb(err)
    else cb(null,body)
  })  
}

/**
 * Update a user's info user by their username as the ID.
 * @param {Object} data, the data to be updated
 * @param {String} username, username associate with user account
 * @param {Function} cb, Callback function to be executed
 */
User.prototype.update = function(data,username,cb){
  geogramdb.insert(data, username, function updateCb(err, body) {
    if(err) cb(err)
    else cb(null,body)
  })
}

/**
 * Delete a user by their username as the ID.
 * @param {String} username, username to be deleted
 * @param {Function} cb, Callback function to be executed
 */
User.prototype.delete = function(username,cb){

  var self = this

  self.read(username, function readCb(err,data){

    if (err) return cb(new Error("User doesn't exist so can't delete."))
    else{
      // Does exist
      geogramdb.destroy(username, data._rev, function destroyCb(err,data){
        if(err) return cb(err)
        return cb(null,data)
      })
    } // end else
  }) // end read()

} // end delete()


/**
 * Get all user documents.
 * @param {String} type, type of document (e.g. user)
 * @param {Function} cb, Callback function to be executed
 */
User.prototype.allDocsByType = function(type,cb){

  geogramdb.view(type, 'all', function viewCb(err, view){
    if(err) return cb(err)
    return cb(null,view)
  }) // end view()

} // end allDocsByType()


module.exports = User