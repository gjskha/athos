/* Gwiki startup code performs the following:
 * 1) Creates the database connection
 * 2) calls in passport configuration
 * 3) general settings
 * 4) imports routes
 */
var express = require('express');
var session = require('express-session');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var passport = require('passport');
var flash = require('connect-flash');
var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var cors = require('cors');

var port = process.env.PORT || 8081;

var app = express();

/* connect to the database */
const dbfile = path.join(__dirname, './db', 'database.db');
var connection = new TransactionDatabase(
  new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

/* code for using promises with sqlite adapted from
 * https://dev.to/michelc/use-sqlite3-in-async-await-mode-57ke */
connection.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.all(sql, params, function (error, rows) {
      if (error)
        reject(error);
      else
        resolve(rows);
    });
  });
};

/* configuration variables */
const conf = require('./config/constants');
app.set('conf', conf);

/* configure passport */
require('./config/passport')(passport,connection); 

/* setting express configuration */
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // needed for auth
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* views */
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

/* things required for passport */
app.use(
  session({
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true
  })
); 
app.use(passport.initialize());
app.use(passport.session()); 
// use connect-flash for flash messages stored in session
app.use(flash()); 

/* routing goes here */
require('./routes')(app, passport, connection); 

app.listen(port);
console.log("Gwiki is listening on port " + port);
