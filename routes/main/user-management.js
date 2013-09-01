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
      username: this.username
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
      
      self.update(self._serializeToJson(), self.username, function insertCb(err, body){
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

User.prototype.read = function(docName,cb){
  geogramdb.get(docName, function(err, body) {
    if (err) return cb(err)
    else cb(null,body)
  })  
}

User.prototype.update = function(data,docName,cb){
  geogramdb.insert(data, docName, function(err, body) {
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
      geogramdb.destroy(username, data._rev, function(err,data){
        if(err) return cb(err)
        return cb(null,data)
      })
    } // end else
  }) // end read()

} // end delete()



module.exports = User