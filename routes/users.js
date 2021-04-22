var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET login */
router.get('/login', function(req, res, next) {
  //res.send('test');
  res.render('login', { title: 'Login' });
});

router.post('/login', function(req, res, next) {
  try {
    // passport
  } catch (error) {
    next(error);
  }

});

module.exports = router;
