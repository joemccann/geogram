
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Geogram' });
};

exports.showme = function(req, res){
  res.render('showme', { title: 'Geogram Viewer' });
};