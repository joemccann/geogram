/* Conditional load of zepto or jquery */
var $lib = ('__proto__' in {} ? 'zepto.min' : 'jquery.min')
require(["log",  "engine.io-dev", $lib, "fastclick" ], function(l,engine, zepto){
  log($lib + ', Fastclick and Log loaded...')
  require(["geogram"], function(geogram){
	  new FastClick(document.body)
		log('FastClick enabled on document.')
		log('All JS files loaded...')
  })
})


