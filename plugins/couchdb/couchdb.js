var fs = require('fs')
	,	path = require('path')

// TODO: REFECTOR WITH STREAM/NON-BLOCKING
var couchdb_config = JSON.parse( fs.readFileSync( path.resolve(__dirname, 'couchdb-config.json'), 'utf-8' ) )

var nano = require('nano')(couchdb_config.url)


module.exports = nano

