/* Conditional load of zepto or jquery */
var $lib = ('__proto__' in {} ? 'zepto.min' : 'jquery.min')

require(["log",  "engine.io-dev", $lib, "fastclick", "handlebars-1.0.0" ], function(l,engine,lib,fc,hbs){

  require(["geogram"], function(geogram){

	  new FastClick(document.body)

		log('All JS files loaded...')

  })

})


