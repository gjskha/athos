var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var splatRouter = require('./routes/splat');

var app = express();
/////////////////////////////////////////////
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));
var passport = require('passport');
var Strategy = require('passport-local').Strategy;
var db = require('./db');

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

// test
app.set('date',Date());

// Configure the local strategy for use by Passport.
//
// The local strategy requires a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.

/*
findById = function(id, cb) {
  //process.nextTick(function() {
    var q = `SELECT * 
	     FROM USERS
	    WHERE USERID = ?`;

   dbh.get(q, [id], (err, row) => {
  if (err) {
    return console.error(err.message);
  }
  //return row
  console.log(row.USERID+" + "+id);
  if (row.USERID === id) {
     return cb(null, row);
  }

  });
//});
}

let findByUsername = function(username,cb) {
  //process.nextTick(function() {
   var q = `SELECT * 
	     FROM USERS
	    WHERE USERNAME = ?`;
  dbh.get(q, [username], (err, row) => {
  if (err) {
    return console.error(err.message);
  }
  console.log(row.USERNAME+" + "+username);
  if (row.USERNAME === username) {
     return cb(null, row);
  }
   return cb(null, null);
   });
  //});
}
*/

passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
    //findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      console.log(user);
      //if (user.passwordhash !== password) { return cb(null, false); }
      if (user.PASSWORD !== password) { return cb(null, false); }
      return cb(null, user);
    });
  }));

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser(function(user, cb) {
  //cb(null, user.id);
  cb(null, user.USERID);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
  //findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});
/////////////////////

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('*', splatRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
