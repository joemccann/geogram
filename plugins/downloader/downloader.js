var fs = require('fs')
	, url = require('url')
	, path = require('path')
	, http = require('http')


/**
 * Constructor
 * @param {String} folderPath, the path where to save the files
 */
var Downloader = function(folderPath){
	this.folderPath = folderPath
}


/**
 * Cycles through an array of images and downloads them
 * @param {Object} json, JSON response from Instagram of array of images
 * @param {Function} cb, callback function
 */
Downloader.prototype.downloadSetOfFiles = function(json, cb){

    console.info("Starting a new download of images...")

	var self = this

	if(!json || !json.data) return cb(new Error('No JSON data.'))

	if(!json.data.length) return cb(new Error('No images to download.'))

	// Iterate over each one and download
	json.data.forEach(function dowloadSetForeachCb(el){
		self.downloadFile( el.images.standard_resolution.url )
	})	

    return cb(null,"All images downloaded.")

} // end downloadSetOfFiles


// Thanks @rogeriopvl https://github.com/rogeriopvl/downstagram/blob/master/lib/downstagram.js#L70

/**
 * Downloads a photo with a given URL
 * @param {String} fileURL, the URL of the photo to download
 * @param {String} folderSuffix, the folder name to append to main download folder
 */
Downloader.prototype.downloadFile = function(fileURL, folderSuffix){
    
    var options = {
        host: url.parse(fileURL).host,
        port: 80,
        path: url.parse(fileURL).pathname
    }

    var folderPath = path.join(this.folderPath, (folderSuffix || 'random_instagram_photos') )

    if (!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath)
    }

    var fileName = url.parse(fileURL).pathname.split('/').pop()
    	,	file = fs.createWriteStream(folderPath + '/' + fileName)
    	,	self = this
    	,	req = http.get(options, function(res){

        var content = ''
        	;
        
        res.on('data', function(chunk){
            file.write(chunk)
        })
        
        res.on('end', function(chunk){
            file.end()
        })

    }) // end http.get()

    req.on('error', function(e){
        console.log('Error on request: ' + e);
    })

    return req.end()
    
}


module.exports = Downloader