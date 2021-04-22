var express = require('express');
var router = express.Router();

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  req.levels = req.baseUrl.split('/');
  next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log(req.levels);
  res.render('index', { title: 'Express Splat' });
});

module.exports = router;
