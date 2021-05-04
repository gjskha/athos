var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var path = require('path');

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  
  //req.dbh = new sqlite3.Database('../db/database.db');	
  //req.dbh = new sqlite3.Database('database.db');	
  const dbfile = path.join(__dirname, '../db', 'database.db');

  req.dbh = new sqlite3.Database(dbfile, (err) => {
    if (err) {
      return console.error(err.message);
    }
  });

  next();

})


/* GET home page. */
router.get('/', function(req, res, next) {
  
  var q = `SELECT * 
	     FROM REVISIONS 
	    WHERE BLOCKID = ?
	 ORDER BY CREATED DESC`;
  const blockid = 1;

// first row only
var r = req.dbh.get(q, [blockid], (err, row) => {
  if (err) {
    return console.error(err.message);
  }
  return row
    ? console.log(row.REVISIONID, row.TEXT, row.USERID)
    : console.log(`error retrieving document`);

});


  console.log(r);

  res.render('index', { title: 'Express' });


});


// get /search
function performSearch() {}
module.exports = router;
