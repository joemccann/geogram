var express = require('express')
  , routes = require('./routes')
  , mainApp = require('./routes/main')
  , Looper = require('./routes/main/looper.js')
  , looperJobIds = Looper.looperJobIds
  , path = require('path')
  , fs = require('fs')
  , passport = require('passport')
  , qs = require('querystring')
  , app = express(app)
  , colors = require("colors")
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , instagram_config = require('./plugins/instagram/instagram-config.json')
  , redisConfig = require('./plugins/redis/redis-config.json')
  , InstagramStrategy = require('passport-instagram').Strategy
  , instagram_config
  , Jobber = require(path.resolve(__dirname, 'plugins/jobber/jobber.js'))
  , jobber
  , webSocketReference
  ;


var UserModel = require(path.resolve(__dirname,'./routes/main/user-model.js'))



/***************** Socket.io Stuff */

io.configure('production', function(){
  io.enable('browser client gzip')
  io.enable('browser client minification')
  io.set('log level', 0)
})

/***************** End Socket.io Stuff */



/***************** Redis Stuff */

var redis = require("redis")
  , RedisStore = require('connect-redis')(express)

var redisOptions = {
  host:redisConfig.host,
  port:redisConfig.port,
  pass:redisConfig.pass,
  auth:redisConfig.auth,
  db: 'geogram-redis'
}

var redisClient = redis.createClient(redisOptions.port, redisOptions.host,{no_ready_check:true})

redisClient.on("ready", function(){

  redisClient.auth(redisOptions.auth, function (err) {
    if(err) { throw err }
    console.info("You are now connected to your redis.".green)

  }) // end redisClient.auth()

}) // end redisClient.on('ready')

/***************** End Redis Stuff */


var package = require(path.resolve(__dirname, './package.json'))

// Setup local variables to be available in the views.
app.locals.title = "Geogram by Joe McCann"
app.locals.description = "Geogram • Capture Instagrams in a Geofenced Region"
app.locals.node_version = process.version.replace('v', '')
app.locals.app_version = package.version
app.locals.env = process.env.NODE_ENV
app.locals.show_modal = false
app.locals.instagram_json = null

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

app.get('/showme', ensureAuthenticated, routes.showme)

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
})

app.get('/settings', ensureAuthenticated, function(req, res){
  res.render('settings', { user: req.user });
})

app.get('/about', function(req, res){
  res.render('about', { user: req.user })
})

app.get('/logout', function(req, res){
  req.logout()
  res.redirect('/')
})

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
})

app.get('/oauth/instagram',
  passport.authenticate('instagram'),
  function(req, res){})

app.get('/oauth/instagram/callback', 
  passport.authenticate('instagram', { failureRedirect: '/login' }),
  function(req, res){
    res.redirect('/')
    // add user to DB, note, user may already exist but user model logic
    // checks for that
    var user = new UserModel(req.user)
    user.create(function createUserCb(err,data){

      if(err) return console.error(err.message.red)

      console.log(data.ok ? "Creation was successful.".green : "Creation was a failure.".red)

      // Read a user...
      user.read(req.user.username, function(err,data){
        if(err) return console.error(err)
        console.log(data.username ? "Read of new user was successful.".green : "Read of new user was a failure.".red)
        // console.dir(data)
      }) // end

    }) // end user.create()
  })


passport.serializeUser(function(user, done){
  done(null, user);
})

passport.deserializeUser(function(obj, done){
  // Let's make the instagram data available to the UI
  app.locals.instagram_profile = obj._json.data.profile_picture
  app.locals.instagram_json = 'var instagramUser = '+JSON.stringify(obj._json.data) 
  done(null, obj);
})


function ensureAuthenticated(req, res, next) {

  if (req.isAuthenticated()){
    app.locals.show_modal = false
    return next() 
  }
  else{
    app.locals.instagram_profile = app.locals.instagram_json = null
    app.locals.show_modal = true
    return next()
  }
}

function runThisJob(data,jobId){
  // config,looper,cb
  jobber.processJob(data,jobId,function processJobCb(err,data){
    if(err) return console.error(err)
    return console.log(data)
  })
}


// jobIds which are currently connected to the chat
var jobIds = {};

io.sockets.on('connection', function (socket){

  socket.on('geosearch', function(d){
    // console.dir(d)

    var objData = qs.parse(d.data)

    // we stringify it back so the qs params are a single unique string
    var uniqueJobId = jobber.createUniqueJobId(d.data) 

    // add to global jobsIDs and change value of d to its parsed qs version
    jobIds[uniqueJobId] = d.data = qs.parse(d.data)

    socket.uuid = uniqueJobId

    // Then browser session if neither...
    if(!objData.minUTC || !objData.maxUTC){
      jobIds[uniqueJobId].isBrowserSessionOnly = socket.isBrowserSessionOnly = true
      socket.uuid = uniqueJobId
    }

    // Add ID here for each unique job
    if(d.data.minUTC || d.data.maxUTC){

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

              // runThisJob(d, uniqueJobId)

              return console.log(data)
            }) // addJobToDb
          } // end else createJob()
        }) // end createJob()

      }) // end doesJobExist

    } // end if

    // Still execute search regardless...eventually only execute jobs
    mainApp.realtime_search_geo(d.data,uniqueJobId,socket,
      function realtime_search_geoCb(err,data){

      if(err){
        console.error(err)
        socket.emit('geosearch-response',{data:err,uuid:uniqueJobId, error:true})
      }
      else {
        // console.log(data)
        socket.emit('geosearch-response',{data:data, uuid:uniqueJobId})
      }
    
    }) // end realtime_search_geo()    
  }) // end socket.on('geosearch')



  // socket.on('fetch-user-docs', function(d){

  //     mainApp.fetchAllDocs(function(err,data){

  //       if(err){
  //         console.error(err)
  //         socket.send(JSON.stringify({data:err,type:v.type,error:true}))
  //       }
  //       else {
  //         // console.log(data)
  //         socket.send(JSON.stringify({data:data,type:v.type}))
  //       }
      
  //     }) // end fetchAllDocs()
  // }


  socket.on('killjob', function(data){

    console.log("socket on killjob")

    // remove the jobId from global jobId hash
    delete jobIds[data.jobId];

    // Confirm on client side
    io.sockets.emit('jobremoved', data.jobId)

    // remove it from the looper to stop the interval
    Looper.removeLooperById(data.jobId)
    console.log("killed job "+ data.jobId)

    console.dir(jobIds)
    
  }) // end socket.on('killjob')


  // when the user disconnects.. perform this
  socket.on('disconnect', function(){
    
    if(socket.uuid && jobIds[socket.uuid] && socket.isBrowserSessionOnly){
      // remove the jobId from global jobId hash
      delete jobIds[socket.uuid];
      // Confirm on client side
      io.sockets.emit('jobremoved', socket.uuid)
      // remove it from the looper to stop the interval
      Looper.removeLooperById(socket.uuid)
      console.dir(jobIds)
    }

    console.log("on disconnect")

  }) // end socket.on('disconnect')

}) // end io.sockets.on('connection')



server.listen(process.env.PORT || 3030, function(){

  console.log("\033[96m\nhttp://127.0.0.1:" + app.get('port') +"\033[96m\n")

  // Init Jobber
  jobber = new Jobber(mainApp, webSocketReference)

  jobber.initializeJobs()

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
  )) // end passport.use()

}) // end server.listen()



// Dirty

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function(err) {
    // handle the error safely
    console.error(err)
    if(err.stack) console.trace(err.stack)
});