/* Conditional load of zepto or jquery */
var $lib = ('__proto__' in {} ? 'zepto.min' : 'jquery.min')

require(["log", "md5", "jstz.min", "socket.io.min", $lib, "fastclick", "handlebars-1.0.0" ], function(){

  require(["geogram"], function(geogram){

	  new FastClick(document.body)

		log('All JS files loaded...')

  })

})


