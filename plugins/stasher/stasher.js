var fs = require('fs')
	, path = require('path')


/**
 * Constructor
 * @param {String} folderPath, the path where to save the files
 */
var Stasher = function(folderPath){
	this.savePath = folderPath
}


/**
 * Writes the json content to a file
 * @param {String} folderName, The name of the folder to create and write to
 * @param {String} filename, The name of the file to be written
 * @param {String} json, The data to be written, in JSON format
 * @param {Function} cb, callback function
 */
 Stasher.prototype.stashInFile = function(folderName,filename,json){

  var folderPath = path.join(this.savePath, (folderName || 'random_stash') )

  if (!fs.existsSync(folderPath)){
      fs.mkdirSync(folderPath)
  }

  var uniqueName = filename + '.json'

  var stream = fs.createWriteStream( folderPath + '/' + uniqueName, {encoding: 'utf-8'})
  
  stream.write(JSON.stringify(json))
    
  stream.end()

  console.log('File: '.green +uniqueName.toString().yellow+ ' succesfully written'.green +' in \n'+folderPath.yellow+ ' \ndirectory.')


}

module.exports = Stasher