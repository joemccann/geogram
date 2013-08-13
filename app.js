
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')

var app = express()

// all environments

var package = require(path.resolve(__dirname, './package.json'))

// Setup local variables to be available in the views.
app.locals.title = "Geogram by Joe McCann"
app.locals.description = "Geogram • Capture Instagrams in a Geofenced Region"
app.locals.node_version = process.version.replace('v', '')
app.locals.app_version = package.version
app.locals.env = process.env.NODE_ENV

app.set('port', process.env.PORT || 3030)
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(express.favicon())
app.use(express.logger(app.locals.env === 'production' ? 'tiny' : 'dev' ))
app.use(express.compress())
app.use(express.bodyParser())
app.use(express.methodOverride())
app.use(app.router)
app.use(require('stylus').middleware(__dirname + '/public'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.directory(__dirname + '/public'));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler())
}

// Core routes
app.get('/', routes.index)


// Instagram routes
var instagram_routes = require('./routes/instagram')

app.post('/search/geo', instagram_routes.search_geo_post)


// Fire up server...
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
  console.log("\nhttp://127.0.0.1:" + app.get('port'))
})


/*
// deleteme

var k = "Times_Square_520252170212685996_195127509"
var l = "Times_Square_520271669447995739_309782411"

var leveldb = require(__dirname+'/plugins/leveldb/leveldb.js')


leveldb.get('ALL_KEYS', {encoding: 'json' }, function (err, value) {
	if (err) return console.log('Ooops!', err) // likely the key was not found

	console.dir(value)
	console.log('finished fetching ALL KEYS...')
})


// 3) fetch by key
leveldb.get(k, {encoding: 'json' }, function (err, value) {
	if (err) return console.log('Ooops!', err) // likely the key was not found

	console.dir(value.data.length)
	console.log('finished fetching...')
})

// end deleteme
*/

// Dirty

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.log(err);
});
