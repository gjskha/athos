/* Specialty routes for front page, API, etc */
// Alternative, Header : compare, etc 
// if header x: then y

var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var path = require('path');

var passport = require('passport');
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var diff = require('simplediff');

const dbfile = path.join(__dirname, '../db', 'database.db');
const dbh = new sqlite3.Database(dbfile, (err) => {
  if (err) {
    return console.error(err.message);
  }
});

// meant for straight sqlite
// https://dev.to/michelc/use-sqlite3-in-async-await-mode-57ke
dbh.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.all(sql, params, function (error, rows) {
      if (error)
        reject(error);
      else
        resolve({ rows: rows });
    });
  });
};

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  next();
})

/* GET home page. */
router.get('/', function(req, res, next) {
  
  var q = `SELECT * 
	     FROM REVISIONS 
	    WHERE BLOCKID = ?
	 ORDER BY CREATED DESC`;
  const blockid = 1;

req.dbh.get(q, [blockid], (err, row) => {
  if (err) {
    return console.error(err.message);
  }
  return row
    ? console.log("REVISION_ID "+row.REVISIONID+" TEXT "+row.TEXT+" USERID "+row.USERID)
    : console.log(`error retrieving document`);

});

  res.render('index', { 
    title: 'Welcome to Gwiki' 

  });

});

/* create Revision */
//router.post('/internal/revisions', ensureLoggedIn('/users/login'), async function(req, res, next) {
router.post('/internal/revisions', ensureLoggedIn('/users/login'),  function(req, res, next) {

   const revisionText = req.body.revision_text;
   const blockId = req.body.block_id;
   //const revisionDate = new Date();
   // https://stackoverflow.com/questions/22252226/passport-local-strategy-and-curl
   const revisionUser = req.user.USERID;
   
   //if (revisionText && blockId && revisionDate && revisionUser) {
   if (revisionText && blockId && revisionUser) {
     // const result = createRevision(revisionText,blockId,revisionDate,revisionUser); 
     //const result = await createRevision(revisionText,blockId,revisionUser); 
     const result = createRevision(revisionText,blockId,revisionUser); 

     if (typeof(result) !== "undefined") {
       res
         .status("201")
         .set('Content-Type', 'text/plain')
         .send({ 
            "result" : result,
         }) 
         .end();

     } else {
        res
          .status("403")
          .set('Content-Type', 'text/plain')
          .send({ "Error" : "missing parameter" }) 
          .end();
     }
   }
});

// async function createRevision(revisionText,blockId,revisionDate,revisionUser) {
async function createRevision(revisionText,blockId,revisionUser) {
 
  let result;
  try {
    const insertRevisionStmt = `INSERT INTO REVISIONS (TEXT,BLOCKID,CREATED,USERID) VALUES (?,?,DATETIME('now'),?)`;
    result = await dbh.query(insertRevisionStmt, [revisionText,blockId,revisionUser]);
    //const insertRevisionStmt = `INSERT INTO REVISIONS (TEXT,BLOCKID,CREATED,USERID) VALUES (?,?,?,?)`;
    //result = await dbh.query(insertRevisionStmt, [revisionText,blockId,revisionDate,revisionUser]);
  } catch (e) { 
    console.error(e.message); 
  }   
  return result;
}

/* Compare revisions */
router.get('/internal/revisions/:left/:right', async function(req, res, next) {

   const left = req.params.left;
   const right = req.params.right;
   
   if (left && right) {

     const result = await compareRevisions(left,right); 
     // console.log(result);

     if (typeof(result) !== "undefined") {
       res
         .status("200")
         .set('Content-Type', 'text/plain')
         .send({ 
            "result" : result,
         }) 
         .end();

     } else {
        res
          .status("400")
          .set('Content-Type', 'text/plain')
          .send({ "Error" : "comparison unavailable" }) 
          .end();
     }
   } else {
     res
       .status("403")
       .set('Content-Type', 'text/plain')
       .send({ "Error" : "Missing parameter" }) 
       .end();
   }
});

async function compareRevisions(left,right) {

  let result;
  let diffText;

  try {
    const revisionCompareQuery = `select REVISIONID,TEXT,CREATED from revisions where revisionid = ? or revisionid = ?`;
    result = await dbh.query(revisionCompareQuery, [left,right]);

  } catch (e) { 
    console.error(e.message); 
  }
 
  if (result.rows.length === 2) {

    diffText = {
      "left" : result.rows[0],
       "right" : result.rows[1],
      "result" : diff.diff(result.rows[0].TEXT,result.rows[1].TEXT),
    }
  } 

  return diffText;
}

// Get categories belonging to a parent category
router.get('/internal/categories/:categoryid/children', async function(req, res, next) {
  const categoryid = req.params.categoryid;
  
  if (typeof(categoryid) !== "undefined") {

  const result = await compareRevisions(categoryid); 

    console.log(result);

    // is currently undefined
    if (typeof(result) !== "undefined") {
      res
        .status("200")
        .set('Content-Type', 'text/plain')
        .send({ 
           "result" : result,
         }) 
         .end();

     } else {
        res
          .status("400")
          .set('Content-Type', 'text/plain')
          .send({ "Error" : "resource unavailable" }) 
          .end();
     }
   } else {
     res
       .status("403")
       .set('Content-Type', 'text/plain')
       .send({ "Error" : "Missing parameter" }) 
       .end();
   }
});

async function getChildCategories(parentId) {
  
  let result;

  try {
   // can be 0 or more results
    const getChildrenQuery = `SELECT CATEGORYTEXT FROM CATEGORIES WHERE PARENT = ?`;
    result = await dbh.query(getChildrenQuery, [parentId]);

    console.log(result);

  } catch (e) { 
    console.error(e.message); 
  }
 
  return result;
}

// patch /block/:block_id/category/:category_id
function addCategoryToBlock()  {}
// multiple categories can have one block

// delete /block/:block_id/category/:category_id
function removeCategoryFromBlock() {}

// get /block/:block_id/categories 
function getBlockCategories() {} // getCategories {};
// (for all categories pointing to a block)

// get /search
function performSearch() {}

module.exports = router;
