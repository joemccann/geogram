var levelup = require('levelup')

// 1) Create our database, supply location and options.
//    This will create or open the underlying LevelDB store.
var db = levelup('./geogram-db')

module.exports = db


// // keep track of all keys
// function updateKeysCollection(key){

//   leveldb.get("ALL_KEYS", {encoding: 'json'}, function (err, value) {
//     if(err){
//         // Doesn't exist so create it
//         var keysArr = []
//         keysArr.push(key)
//         leveldb.put('ALL_KEYS', keysArr, {encoding: 'json'}, function(err){
//           if(err) console.log('Ooops!', err) // likely the key was not found
//           else console.info("put keysArr init")
//         }) // end put
//       }else{
//         var arr = value
//         arr.push(key)
//         leveldb.put('ALL_KEYS', arr, {encoding: 'json'}, function(err){
//           if(err) console.log('Ooops!', err) // likely the key was not found
//           else console.info("appending to arr")
//         }) // end put
//       }
//     }) // end get

// } // end updateKeysCollection

// function stashInLevelDb(req, originalJson){

//     var leveldbKey = req.body.name_of_folder + "_" + originalJson.data[0].id

//     // console.log(leveldbKey + " is the leveldbkey")

//     updateKeysCollection(leveldbKey)

//     leveldb.put(leveldbKey, originalJson, {encoding: 'json' }, function (err) {
//       if (err) return console.log('Ooops!', err) // some kind of I/O error

//       leveldb.get(leveldbKey, {encoding: 'json' }, function (err, value) {
//         if (err) return console.log('Ooops!', err) // likely the key was not found
//         // console.dir(value)
//         console.log('finished fetching...')
//       }) // end get
//     }) // end put

// }
