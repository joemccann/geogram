/* Conditional load of zepto or jquery */
var $lib = ('__proto__' in {} ? 'zepto.min' : 'jquery.min')
require(["log",  $lib, "fastclick" ], function(l, zepto){
  log($lib + ', Fastclick and Log loaded...')
  require(["subprint-0.0.3-24.min"], function(subprint){
	  new FastClick(document.body)
		log('FastClick enabled on document.')
		log('All JS files loaded...')
  })
})