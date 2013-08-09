
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

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler())
}

app.get('/', routes.index)

// Remove or comment below if you don't want Dropbox support
var instagram_routes = require('./routes/instagram')

app.post('/search/geo', instagram_routes.search_geo_post)


// Fire up server...
http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'))
  console.log("\nhttp://127.0.0.1:" + app.get('port'))
})