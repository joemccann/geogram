var assert = require('assert')

var User = require(__dirname + '/user-management')

var testData = {"username":"joemccann",
                "bio":"The Make It Happen Captain",
                "website":"http://subprint.com",
                "profile_picture":"http://images.ak.instagram.com/profiles/profile_2260821_75sq_1365292632.jpg",
                "full_name":"Joe McCann","counts":{"media":1101,"followed_by":407,"follows":162},
                "id":"2260821"
                }
var testUser = new User(testData)

// Create a user...
// testUser.create(function createUserCb(err,data){

//   if(err) return console.error(err)

//   console.log(data.ok ? "Creation was successful.".green : "Creation was a failure.".red)

//   // Read a user...
//   testUser.read(testData.username, function(err,data){
//     if(err) return console.error(err)
//     assert(data.username === testData.username)
//     // console.dir(data)
//   }) // end


// })

// Delete a user...
testUser.delete(testData.username, function(err,data){
  if(err) return console.error(err)
  console.log(data.ok ? "Deletion was successful.".green : "Deletion was a failure.".red)
}) // end

// // // Read a user...
// testUser.read(testData.username, function(err,data){
//   if(err) return console.error(err)
//   assert.equal(data.username, testData.username, "Usernames are not equal.")


// // Update a user...
// var cacheBio = data.bio
// data.bio = "Updated bio."

// testUser.update(data, data.username, function(err,data){
//   if(err) return console.error(err)
//   console.log(data.ok ? "Update was successful.".green : "Update was a failure.".red)

//   testUser.read(testData.username, function(err,data){
//     if(err) return console.error(err)
//     assert.equal(data.bio, "Updated bio.", "Bio's are not equal.")
//     // console.dir(data)
//   }) // end
// }) // end


//   // console.dir(data)
// }) // end


