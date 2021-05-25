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

/*const dbh = new sqlite3.Database(dbfile, (err) => {
  if (err) {
    return console.error(err.message);
  }
});
*/

var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
var dbh = new TransactionDatabase(
    new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

// FIXME
/* global flags for requested Categories */
const NOTFOUND = 0;
const FOUND = 1;
const LOCKED = 2;
const DELETED = 3;

/* constants for Revisions */
const CURRENT = 0;
const ARCHIVE = 1;

// meant for straight sqlite
// https://dev.to/michelc/use-sqlite3-in-async-await-mode-57ke
dbh.query = function (sql, params) {
  var that = this;
  return new Promise(function (resolve, reject) {
    that.all(sql, params, function (error, rows) {
      if (error)
        reject(error);
      else
        //resolve({ rows: rows });
        resolve(rows);
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
              AND STATUS = 0
	 ORDER BY CREATED DESC`;
  const blockid = 1;

dbh.get(q, [blockid], (err, row) => {
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
//router.post('/internal/revisions', function(req, res, next) {

   const revisionText = req.body.revision_text;
   const blockId = req.body.block_id;
   console.log("revision_text is "+revisionText);
   //const revisionDate = new Date();
   // https://stackoverflow.com/questions/22252226/passport-local-strategy-and-curl
   //const revisionUser = req.user.USERID;
   let revisionUser;
   
   if (req.user) {
     revisionUser = req.user.USERID;
     console.log("logged in is "+revisionUser); 
   } else {
     console.log("No user logged in"); 
   }

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

    const insertRevisionStmt = `INSERT INTO REVISIONS (TEXT,BLOCKID,CREATED,USERID,STATUS) VALUES (?,?,DATETIME('now'),?,?)`;
    // result = await dbh.query(insertRevisionStmt, [revisionText,blockId,revisionUser,CURRENT]);
    
    const archiveOldRevisionStmt = `UPDATE REVISIONS SET STATUS = 1 WHERE BLOCKID = ?`;
 
     dbh.beginTransaction(function(err, transaction) {
       /* update the old revisions to archived status */
       dbh.run(archiveOldRevisionStmt, [blockId], (err) => {
         if (err) {
            console.error(err.message);
            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });
          }
       }); 
 
       /* insert the new revision */ 
       dbh.run(insertRevisionStmt, [revisionText,blockId,revisionUser,CURRENT], (err) => {
          if (err) {
            console.error(err.message);
            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });
          }
        
          console.log(`A row has been inserted into revisions with rowid ${this.lastID}`);
       });

       /* commit the transaction */ 
       transaction.commit(function(err) {
          if (err) {
            return console.log(`Error: ${err.message}`);
          }

          console.log(`transaction for editing ${blockId} succeeded`);
       });

     });
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
 
  if (result.length === 2) {

    diffText = {
      "left" : result[0],
      "right" : result[1],
      "diff" : diff.diff(result[0].TEXT,result[1].TEXT),
    }
  } 

  return diffText;
}

// Get categories belonging to a parent category
router.get('/internal/categories/:category_id/children', async function(req, res, next) {
  const categoryId = req.params.category_id;
  
  if (typeof(categoryId) !== "undefined") {
  
    const result = await getChildCategories(categoryId); 
  
    console.log(result);
  
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
 
    result.forEach((item, index, arr) => {
      arr[index] = item.CATEGORYTEXT;
    }); 
 
  } catch (e) { 
    console.error(e.message); 
  }

  return result;
}

// List Revisions
router.get('/internal/blocks/:block_id/revisions', async function(req, res, next) {

  const blockId = req.params.block_id;

   if (typeof(blockId) !== "undefined") {
  
    const result = await listRevisions(blockId); 
  
    console.log(result);
  
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

async function listRevisions(blockId) {

  let result;

  const listRevisionsQuery = `SELECT R.REVISIONID,R.CREATED,U.USERNAME 
                                FROM REVISIONS R, USERS U
                               WHERE R.BLOCKID = ?
                                 AND U.USERID = R.USERID
                            ORDER BY R.CREATED DESC`;

 try {
    result = await dbh.query(listRevisionsQuery, [blockId]);

  } catch (e) { 
    console.error(e.message); 
  }

  return result;

}

// get a particular revision
router.get('/internal/blocks/:block_id/revisions/:revision_id', async function(req, res, next) {

  const blockId = req.params.block_id;
  const revisionId = req.params.revision_id;

    if ((typeof(blockId) !== "undefined") && (typeof(revisionId) !== "undefined")) {
  
    const result = await getRevision(blockId,revisionId); 
  
    console.log(result);
  
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

async function getRevision(blockId,revisionId) {

  let result;

  const getRevisionQuery = 
    `SELECT TEXT,CREATED,USERID 
       FROM REVISIONS 
      WHERE BLOCKID = ?
        AND REVISIONID = ? 
      ORDER BY CREATED DESC`;

  try {

    result = await dbh.query(getRevisionQuery, [blockId, revisionId]);

  } catch (e) { 
    console.error(e.message); 
  }

  return result;

}

// Add a category to block
router.patch('/internal/blocks/:block_id/categories/:category_id', ensureLoggedIn('/users/login'), async function(req, res, next) {

  const blockId = req.params.block_id;
  const categoryId = req.params.category_id;

    if ((typeof(blockId) !== "undefined") && (typeof(categoryId) !== "undefined")) {
  
    const result = await addCategoryToBlock(blockId,categoryId); 
  
    // console.log(result);
  
    if (typeof(result) !== "undefined") {
      res
        .status("201")
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

async function addCategoryToBlock(blockId, categoryId)  {

  const blockCategoryStmt = `INSERT INTO BLOCKS_CATEGORIES (BLOCKID,CATEGORYID) VALUES (?,?)`;

  let result;
  try {
    result = await dbh.query(blockCategoryStmt, [blockId, categoryId]);

  } catch (e) { 
    console.error(e.message); 
  }

  return result;

}

// multiple categories can have one block

// delete /block/:block_id/category/:category_id
function removeCategoryFromBlock() {}

// get /block/:block_id/categories 
router.get('/internal/blocks/:block_id/categories', async function(req, res, next) {
  const blockId = req.params.block_id;

    if (typeof(blockId) !== "undefined") {
  
    const result = await getBlockCategories(blockId); 
  
    console.log(result);
  
    if (typeof(result) !== "undefined") {
      res
        .status("200")
        .send({ "result" : result })
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

async function getBlockCategories(blockId) {

  const blockCategoriesQuery = 
   `SELECT C.CATEGORYTEXT 
   FROM BLOCKS B 
   INNER JOIN BLOCKS_CATEGORIES X 
   ON B.BLOCKID = X.BLOCKID 
   INNER JOIN CATEGORIES C 
   ON C.CATEGORYID = X.CATEGORYID 
   WHERE B.BLOCKID = ?`;

  let result;
  try {
    result = await dbh.query(blockCategoriesQuery, [blockId]);

  } catch (e) { 
    console.error(e.message); 
  }

  return result;

} // getCategories {};
// (for all categories pointing to a block)

// get /search
router.get('/internal/search/:term', async function(req, res, next) {

  res.status("200").send("placeholder");

});

function performSearch(term) {
}

module.exports = router;
