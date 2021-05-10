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

var r = req.dbh.get(q, [blockid], (err, row) => {
  if (err) {
    return console.error(err.message);
  }
  return row
    ? console.log("REVISION_ID "+row.REVISIONID+" TEXT "+row.TEXT+" USERID "+row.USERID)
    : console.log(`error retrieving document`);

});

  console.log(r);
  res.render('index', { title: 'Express' });
});

/* create Revision */
router.post('/internal/revisions', ensureLoggedIn('/users/login'), function(req, res, next) {

   const revisionText = req.body.revision_text;
   const blockId = req.body.block_id;
   //const revisionDate = new Date();
   // https://stackoverflow.com/questions/22252226/passport-local-strategy-and-curl
   const revisionUser = req.user.USERID;
   
   // req.categoryData....
   if (revisionText && blockId && revisionDate && revisionUser) {
     // const result = createRevision(revisionText,blockId,revisionDate,revisionUser); 
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

async function createRevision(revisionText,blockId,revisionDate,revisionUser) {
 
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
// TBD: URL
//router.get('/internal/revisions/:block_id', function(req, res, next) {
router.get('/internal/revisions/:left/:right', function(req, res, next) {

   const left = req.params.left;
   const right = req.params.right;
   
   if (left && right) {

     const result = compareRevisions(left,right); 

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

async function compareRevisions(left,right) {

  const revisionCompareQuery = `select REVISIONID,TEXT,CREATED from revisions where revisionid = ? or revisionid = ?`;

  //const foo = diff.diff('aaa', 'ddd');
  //console.log("diff is "); console.log(foo);
}

// TBD AddRevision

// get /category/:categoryid/childcategories
function getChildCategories() {

   // can be 0 or more results
   const getChildrenQuery = `SELECT CATEGORYID,CATEGORYTEXT FROM CATEGORIES WHERE PARENT = ?`;

}


// X
// get /category/:categoryid/block 
//function getCategoryBlock() {
//}

// patch /block/:block_id/category/:category_id
function addCategoryToBlock()  {}
// multiple categories can have one block

// delete /block/:block_id/category/:category_id
function removeCategoryFromBlock() {}

// get /block/:block_id/categories 
function getBlockCategories() {} // getCategories {};
// (for all categories pointing to a block)


// X
/* get Block */
/* router.get('/blocks/:block_id', function(req, res, next) {

   const blockId = req.params.block_id;
   const getBlockStmt = `SELECT TITLE,CREATED,TYPE FROM BLOCKS WHERE BLOCKID = ?`;
   
   dbh.get(getBlockStmt, (err, row) => {
      if (err) {
         return console.error(err.message);
      }

      if (typeof(row) !== "undefined") {

      console.log(`Fetching ${blockId}`);

       // ??
       res
         .status(200)
         .set('Content-Type', 'text/plain')
         .send({ 
            'blockTitle' : row.TITLE, 
            'blockCreated' : row.CREATED, 
            'blockType' : row.TYPE, 
          })
        .end();       

    } else {
      console.log(`error, no block with blockID ${blockId}`);

       res
        .status("404")
        .set('Content-Type', 'text/plain')
        .send({ "Error" : `no blockId ${blockId}` }) 
        .end();
    }
  });
});

*/

// X
// get /category/:category_id
// this url doesn't make sense
/*router.post('/category/:category_id', ensureLoggedIn('/users/login'), function(req, res, next) {

       const categoryText = req.body.categoryText;
       const created = new Date();

       res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send(req.categoryData)
        .end();       
});
*/

// X
//function createBlock(blockTitle,blockType) {
//   const createBlockQuery = `insert into blocks (title,created,type) values (?,datetime('now'),?)`;
//}


// put /category/:category_id
//function editCategory() {
//}

// get /category/:category_id
//function getCategory(requestedCategory) {
//  const pageDataQuery = 
//  `SELECT C.CATEGORYTEXT, 
//          C.CATEGORYID, 
//          C.PARENT, 
//	  B.TITLE, 
//	  B.BLOCKID, 
//	  R.CREATED, 
//	  U.USERNAME, 
//	  R.TEXT 
//   FROM USERS U 
//   INNER JOIN REVISIONS R ON U.USERID = R.USERID 
//   INNER JOIN BLOCKS B ON R.BLOCKID = B.BLOCKID 
//   INNER JOIN BLOCKS_CATEGORIES X ON X.BLOCKID = B.BLOCKID 
//   INNER JOIN CATEGORIES C ON C.CATEGORYID = X.CATEGORYID 
//   WHERE C.CATEGORYTEXT = ?`;
//
//  dbh.get(pageDataQuery, [requestedCategory], (err, row) => {
//    if (err) {
//      return console.error(err.message);
//    }
//
//    if (row) {
//      res.render('page', { 
//        categorytext : row.CATEGORYTEXT,
//        categoryid : row.CATEGORYID, 
//        parentid : row.PARENT, 
//        title : row.TITLE, 
//        blockid : row.BLOCKID, 
//        created : row.CREATED, 
//        username : row.USERNAME, 
//        text : row.TEXT, 
//        //state : req.CategoryData.state,
//        state : "state is tbd logic",
//        levels : req.categoryData.levels,
//      });
//    
//
//      // return row;
//    }	    
//  });
//}

// get /search
function performSearch() {}

module.exports = router;
