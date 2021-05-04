var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

/* GET login */
router.get('/login', function(req, res, next) {
  //res.send('test');
  res.render('login', { title: 'Login' });
});
/* register form */
router.get('/register', function(req, res, next) {
  //res.send('test');
  res.render('register', { title: 'Register' });
});

function registerForm(){}
function registerUser(){}
//function loginForm(){}
//function loginUser(){}

router.post('/login', 
  // . try { successRedirect: '/succesRoute', failureRedirect: '/users/login'}
  passport.authenticate('local', { failureRedirect: '/users/login' }),
  function(req, res) {
    res.redirect('/users/profile');
  });
  
router.get('/logout',
  function(req, res){
    req.logout();
    res.redirect('/');
});

router.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res){
  console.log(req.user);
    res.render('profile', { user: req.user });
});


module.exports = router;
