var path = require('path')
var Instagram = require(
	path.resolve(
		__dirname, '..', '..', 'plugins/instagram/instagram.js')).Instagram


exports.instagram_get_next_page_of_instagram_photos = function(req,res){

  if(!req.session.instagram) return res.redirect('/instagram')

  if(!req.query.next_page_url) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. Missing next_page_url param")
  }
  
  Instagram.Geogram.getNextPageOfInstagramPhotos(req,res)
  
}


exports.search_geo_post = function(req,res){

  if(!req.body.latitude || !req.body.longitude) {
    res.type('text/plain')
    return res.status(403).send("Bad Request. You need a latitude and longitude.")
  }
  
  Instagram.geogram.executeGeoSearch(req,res)
  
}