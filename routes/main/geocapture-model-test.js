var assert = require('assert')
  , fs = require('fs')
  , mockCaptureData = require(__dirname + '/mock-geocapture-data.json')
  , mockRequestObjectData = require(__dirname + '/mock-request-object-data.json')
  , Geocapture = require(__dirname + '/geocapture-model')
  , testData = {
                "type": "geocapture",
                "username":"joemccann",
                "id":"test-debug-id-should-be-hash",
                }
  , testUser = new Geocapture(testData.username,testData.id,mockRequestObjectData)
  ;

/*****************************************************************************************/
// Create a geocapture document...

// testUser.create(mockCaptureData, function createCb(err,data){

//   if(err) return console.error(err.message.red)

//   console.log(data.ok ? "Creation was successful.".green : "Creation was a failure.".red)

//   // Read a user...
//   testUser.read(testData.id, function(err,data){
//     if(err) return console.error(err.message.red)
//     assert(data.geocapturedData.length, mockCaptureData.length, 
//       "Capture data lengths are not the same from create.")
//     // console.dir(data)
//   }) // end


// })

/*****************************************************************************************/
// Read a geocapture document...

// testUser.read(testData.id, function(err,data){
//   if(err) return console.error(err.message.red)
//   assert(data.id,testData.id, "IDs are not the same from the read.")
//   // console.dir(data)
// }) // end


/*****************************************************************************************/
// Update a user...

// testUser.read(testData.id, function(err,data){
  // if(err) return console.error(err.message.red)

//   var cache = data.geocapturedData
//   data.geocapturedData = []

//   testUser.update(data, data.id, function(err,data){
//     if(err) return console.error(err.message.red)

//     console.log(data.ok ? "Update was successful.".green : "Update was a failure.".red)

//     testUser.read(testData.id, function(err,data){
//       if(err) return console.error(err.message.red)
//       assert.equal(data.geocapturedData.length, 0, "geocapturedData length is not zero.")
//       // console.dir(data)
//     }) // end read
//   }) // end update
// }) // end read


//   // console.dir(data)
// }) // end


/*****************************************************************************************/

// Get all geocapture docs...

// testUser.allDocsByType('geocapture', function(err,data){
//   if(err) return console.error(err.message.red)
//   assert.ok(data.rows.length, "Rows are less than 1, so failure.")
//   console.log("Total number of geocapture docs: "+ data.rows.length.toString().green)
//   // console.dir(data)
// }) // end


/*****************************************************************************************/
// Get all geocapture docs by one user...

// testUser.allDocsByUsername('geocapture', testData.username, function(err,data){
//   if(err) return console.error(err.message.red)
//   assert.ok(data.rows.length, "Rows are less than 1, so failure.")
//   console.log("Total number of geocapture docs by user "+testData.username.toString().bold
//     +": "+ data.rows.length.toString().green)
//   // console.dir(data)
// }) // end


/*****************************************************************************************/

// Delete a doc...

// testUser.delete(testData.id, function(err,data){
//    if(err) return console.error(err.message.red)

//   console.log(data.ok ? "Deletion was successful.".green : "Deletion was a failure.".red)
// }) // end


/*****************************************************************************************/
// Read a geocapture document...

// testUser.read(testData.id, function(err,data){
//   if(err) return console.error(err.message.red)
//   assert(data.id,testData.id, "IDs are not the same from the read.")
//   // console.dir(data)
// }) // end


/*****************************************************************************************/
// Update a user...

// testUser.read(testData.id, function(err,data){
  // if(err) return console.error(err.message.red)

//   var cache = data.geocapturedData
//   data.geocapturedData = []

//   testUser.update(data, data.id, function(err,data){
//     if(err) return console.error(err.message.red)

//     console.log(data.ok ? "Update was successful.".green : "Update was a failure.".red)

//     testUser.read(testData.id, function(err,data){
//       if(err) return console.error(err.message.red)
//       assert.equal(data.geocapturedData.length, 0, "geocapturedData length is not zero.")
//       // console.dir(data)
//     }) // end read
//   }) // end update
// }) // end read


//   // console.dir(data)
// }) // end


/*****************************************************************************************/

// Get all geocapture docs...

// testUser.allDocsByType('geocapture', function(err,data){
//   if(err) return console.error(err.message.red)
//   assert.ok(data.rows.length, "Rows are less than 1, so failure.")
//   console.log("Total number of geocapture docs: "+ data.rows.length.toString().green)
//   // console.dir(data)
// }) // end


/*****************************************************************************************/
// Get all geocapture docs by one user...

// testUser.allDocsByUsername('geocapture', testData.username, function(err,data){
//   if(err) return console.error(err.message.red)
//   assert.ok(data.rows.length, "Rows are less than 1, so failure.")
//   console.log("Total number of geocapture docs by user "+testData.username.toString().bold
//     +": "+ data.rows.length.toString().green)
//   // console.dir(data)
// }) // end


/*****************************************************************************************/

// Delete a doc...

// testUser.delete(testData.id, function(err,data){
//    if(err) return console.error(err.message.red)

//   console.log(data.ok ? "Deletion was successful.".green : "Deletion was a failure.".red)
// }) // end


/*****************************************************************************************/

(function suite(){

testUser.create(mockCaptureData, function createCb(err,data){

  if(err) return console.error(err.message.red)

  console.log(data.ok ? "Creation was successful.".green : "Creation was a failure.".red)

  // Read a user...
  testUser.read(testData.id, function(err,data){
    if(err) return console.error(err.message.red)
    assert(data.geocapturedData.length, mockCaptureData.length, 
      "Capture data lengths are not the same from create.")
    console.log("Read doc successfully.".green)
    var cache = data.geocapturedData
    data.geocapturedData = []

    testUser.update(data, data.id, function(err,data){
      if(err) return console.error(err.message.red)

      console.log(data.ok ? "Update was successful.".green : "Update was a failure.".red)

    testUser.allDocsByType('geocapture', function(err,data){
      if(err) return console.error(err.message.red)
      assert.ok(data.rows.length, "Rows are less than 1, so failure.")
      console.log("Total number of geocapture docs: "+ data.rows.length.toString().green)

      testUser.allDocsByUsername('geocapture', testData.username, function(err,data){
        if(err) return console.error(err.message.red)
        assert.ok(data.rows.length, "Rows are less than 1, so failure.")
        console.log("Total number of geocapture docs by user "+testData.username.toString().bold
          +": "+ data.rows.length.toString().green)

          testUser.delete(testData.id, function(err,data){
            if(err) return console.error(err.message.red)
            console.log(data.ok ? "Deletion was successful.".green : "Deletion was a failure.".red)
          }) // end delete
        }) // end allDocsByUsername
      }) // end allDocsByType
    }) // end update
  }) // end read
}) // end create

})()

