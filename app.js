var express = require('express')
  , routes = require('./routes')
  , mainApp = require('./routes/main')
  , path = require('path')
  , fs = require('fs')
  , passport = require('passport')
  , qs = require('querystring')
  , app = express(app)
  , colors = require("colors")
  , server = require('http').createServer(app)
  , io = require('engine.io').attach(server)
  , pathToInstagramConfig = require('./plugins/instagram/instagram-config.json')
  , pathToRedisConfig = require('./plugins/redis/redis-config.json')
  , InstagramStrategy = require('passport-instagram').Strategy
  , instagram_config
  , Jobber = require(path.resolve(__dirname, 'plugins/jobber/jobber.js'))
  , jobber
  , webSocketReference
  ;

var redis = require("redis")
  , RedisStore = require('connect-redis')(express)

var redisOptions = {
  host:pathToRedisConfig.host,
  port:pathToRedisConfig.port,
  pass:pathToRedisConfig.pass,
  auth:pathToRedisConfig.auth,
  db: 'geogram-redis'
}

var redisClient = redis.createClient(redisOptions.port, redisOptions.host,{no_ready_check:true})

redisClient.on("ready", function(){

  redisClient.auth(redisOptions.auth, function (err) {
      if (err) { throw err; }
    console.info("You are now connected to your redis.".green)

  })

})


// all environments

var package = require(path.resolve(__dirname, './package.json'))

// Setup local variables to be available in the views.
app.locals.title = "Geogram by Joe McCann"
app.locals.description = "Geogram • Capture Instagrams in a Geofenced Region"
app.locals.node_version = process.version.replace('v', '')
app.locals.app_version = package.version
app.locals.env = process.env.NODE_ENV
app.locals.show_modal = false

app.set('port', process.env.PORT || 3030)
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(express.favicon())
app.use(express.logger(app.locals.env === 'production' ? 'tiny' : 'dev' ))
app.use(express.compress())

app.use(express.cookieParser('geogram'));

app.use(express.session({ store: new RedisStore({
  client: redisClient,
  port: redisOptions.port, 
  host: redisOptions.host
}), secret: 'geogram' }))

app.use(express.bodyParser());
app.use(express.methodOverride());

// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize())
app.use(passport.session())
app.use(app.router)
app.use(require('stylus').middleware(__dirname + '/public'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.directory(__dirname + '/public'));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler())
}

// Core routes
app.get('/', ensureAuthenticated, routes.index)

app.get('/showme', routes.showme)


app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/oauth/instagram',
  passport.authenticate('instagram'),
  function(req, res){})

app.get('/oauth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login' }),
  function(req, res){
    res.redirect('/')
  })

// TODO: implement this route
app.get('/logout', function(req, res){
  req.logout()
  res.redirect('/')
})

// passport.use(new LocalStrategy(
//   function(username, done){
//     redis.
//     User.findOne({ username: username, password: password }, function (err, user) {
//       done(err, user);
//     });
//   }
// ));

//    Passport session setup.
//    To support persistent login sessions, Passport needs to be able to
//    serialize users into and deserialize users out of the session.  Typically,
//    this will be as simple as storing the user ID when serializing, and finding
//    the user by ID when deserializing.  However, since this example does not
//    have a database of user records, the complete Instagram profile is
//    serialized and deserialized.
passport.serializeUser(function(user, done){
  // console.dir(user)
  done(null, user);
});

passport.deserializeUser(function(obj, done){
  // console.dir(obj)
  // Let's make the instagram data available to the UI
  app.locals.instagram_profile = obj._json.data.profile_picture
  app.locals.instagram_json = 'var instagramUser = '+JSON.stringify(obj._json.data) 
  done(null, obj);
});


//    Simple route middleware to ensure user is authenticated.
//    Use this route middleware on any resource that needs to be protected.  If
//    the request is authenticated (typically via a persistent login session),
//    the request will proceed.  Otherwise, the user will be redirected to the
//    login page.
function ensureAuthenticated(req, res, next) {

  if (req.isAuthenticated()){
    return next() 
  }
  else{
    // console.dir(req.session)
    app.locals.show_modal = true
    return next()
  }
}


app.post('/search/geo', mainApp.search_geo_post)

io.on('connection', function(socket){

  webSocketReference = socket

  socket.on('message', function(v){
  	
		try{v = JSON.parse(v)}catch(e){}

    // console.dir(v)

    // if we're conducting a search...
  	if(v.type && (v.type == 'geogram-search')){

			var d = qs.parse(v.data)

      // console.dir(d)

      // Add ID here for each unique job
      if(d.minUTC || d.maxUTC){

        // we stringify it back so the qs params are a single unique string
        var uniqueJobId = jobber.createUniqueJobId(qs.stringify(d))

        // Check to see if job exists
        jobber.doesJobExist(uniqueJobId,function doesJobExistCb(err,data){

          // TODO:  Should we inform the user at this point 
          //        that the job already exists?
          if(err) return console.error(err)

          jobber.createJob(d,uniqueJobId,function createJobCb(err,data){

            if(err) return console.error(err)

            else {
              console.log("Job created for id ".green + uniqueJobId.yellow)

              jobber.addJobToDb(d,uniqueJobId,function addJobToDbCb(err,data){
                if(err) return console.error(err)
                console.log("Successfully added job to db.")
                return console.log(data)
              }) // addJobToDb

            } // end else createJob()

          }) // end createJob()

        }) // end doesJobExist

      }

			mainApp.realtime_search_geo(d,socket,v.type,function realtime_search_geoCb(err,data){

				if(err){
					console.error(err)
		    	socket.send(JSON.stringify({data:err,type:v.type,error:true}))
		    }
		    else {
		    	// console.log(data)
		    	socket.send(JSON.stringify({data:data,type:v.type}))
		    }
			
			}) // end realtime_search_geo()

  	}

    // if we're fetching a list of all couchdb docs...
    if(v.type && (v.type == 'list-all-couchdb-docs')){

      mainApp.fetchAllDocs(function(err,data){

        if(err){
          console.error(err)
          socket.send(JSON.stringify({data:err,type:v.type,error:true}))
        }
        else {
          // console.log(data)
          socket.send(JSON.stringify({data:data,type:v.type}))
        }
      
      }) // end fetchAllDocs()

    }

    // if we're fetching an individual doc...
    if(v.type && (v.type == 'get-couchdb-doc-data')){

      mainApp.fetchFromCouch(v.data, function(err,data){

        if(err){
          console.error(err)
          socket.send(JSON.stringify({data:err,type:v.type,error:true}))
        }
        else {
          // console.log(data)
          socket.send(JSON.stringify({data:data,type:v.type}))
        }
      
      }) // end fetchAllDocs()

    }

    // Just a friendly game of...
  	if(v == 'ping'){ socket.send('pong')}

  }) // end onmessage

}) // end io connection


server.listen(process.env.PORT || 3030, function(){

  console.log("\033[96m\nhttp://127.0.0.1:" + app.get('port') +"\033[96m\n")

  // Init Jobber
  jobber = new Jobber(mainApp, webSocketReference)

  jobber.initializeJobs()

  instagram_config = pathToInstagramConfig

  var INSTAGRAM_CLIENT_ID = instagram_config.client_id
  var INSTAGRAM_CLIENT_SECRET = instagram_config.client_secret

  // Use the InstagramStrategy within Passport.
  //   Strategies in Passport require a `verify` function, which accept
  //   credentials (in this case, an accessToken, refreshToken, and Instagram
  //   profile), and invoke a callback with a user object.
  passport.use(new InstagramStrategy({
      clientID: INSTAGRAM_CLIENT_ID,
      clientSecret: INSTAGRAM_CLIENT_SECRET,
      callbackURL: "http://geogram.jit.su/oauth/instagram/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
        
        // To keep the example simple, the user's Instagram profile is returned to
        // represent the logged-in user.  In a typical application, you would want
        // to associate the Instagram account with a user record in your database,
        // and return that user instead.
        return done(null, profile);
      });
    }
  ))


});



// Dirty

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error(err)
    console.trace(err.stack)
});