var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var path = require('path');
var passport = require('passport');

var TransactionDatabase = require("sqlite3-transactions").TransactionDatabase;
var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
//var diff = require('simplediff');

/* global flags for requested Categories */
const NOTFOUND = 0;
const FOUND = 1;
const LOCKED = 2;
const DELETED = 3;

/* constants for Revisions */
const CURRENT = 0;
const ARCHIVE = 1;

const dbfile = path.join(__dirname, '../db', 'database.db');
/*dbh = new sqlite3.Database(dbfile, (err) => {
  if (err) {
    return console.error(err.message);
  }
});
*/

// Wrap sqlite3 database
var dbh = new TransactionDatabase(
    new sqlite3.Database(dbfile, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE)
);

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
/////////////////////////////////////////////////////////////


// invoked for any requests passed to this router
router.use(function (req, res, next) {

  req.categoryData = {
     // candidateId : null,

     candidateText : req.baseUrl,
     blockId : null,
     revisionId : null,
    // categoryText : null, // ??
    // revisionText : null, // ??
     userID: null, // ??
  };

  if (!req.user) {
    req.user = null;
  } 

  req.categoryData.levels = req.baseUrl.split('/');

  const findCatQuery = 
  `SELECT CATEGORYID 
     FROM CATEGORIES
    WHERE CATEGORYTEXT = ?`

  dbh.get(findCatQuery, [req.baseUrl], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
  
    if (row) {
       // category exists
       req.categoryData.categoryId = row.CATEGORYID;
       console.log(`categoryId ${row.CATEGORYID} exists`);
    } else {
        console.log("category does not exist");
        //req.categoryData.CATEGORYID = null;
        req.categoryData.categoryId = null;
    } 	  
    
  });


  next();
});

// create route
/*router.post('/', ensureLoggedIn('/users/login'), function(req, res, next) {

   req.categoryData.candidateText;
   const created = new Date();

       res
        .status(200)
        .end();       
});
*/

// updating (a revision of a block for) a category
router.put('/', ensureLoggedIn('/users/login'), function(req, res, next) {
  const userRevisionText = req.body.revisionText;

});

// deleting a category
router.delete('/', function(req, res, next) {
});


function createBreadCrumbs(levels) {

   let crumbs = [];
   crumbs[0] = { "name" : "/", "href" : "/" };
   let crumbHref = ""; 
   for ( i = 1; i < levels.length; i++) {
       let href = crumbHref + "/" + levels[i];
       crumbs[i] = { "name" : levels[i], "href" : href };
       crumbHref = href;
   } 
   
   return crumbs;
}

/* The root level category gets special treatment in index.routes */
router.get('/', function(req, res, next) {

  console.log("in router get CATEGORYID is ");
  console.log(req.categoryData.categoryId);

  const pageDataQuery = 
  `SELECT C.CATEGORYTEXT, 
          C.CATEGORYID, 
          C.PARENT, 
	  B.TITLE, 
	  B.BLOCKID, 
	  R.CREATED, 
	  U.USERNAME, 
	  R.TEXT, 
	  R.REVISIONID
   FROM USERS U 
   INNER JOIN REVISIONS R ON U.USERID = R.USERID 
   INNER JOIN BLOCKS B ON R.BLOCKID = B.BLOCKID 
   INNER JOIN BLOCKS_CATEGORIES X ON X.BLOCKID = B.BLOCKID 
   INNER JOIN CATEGORIES C ON C.CATEGORYID = X.CATEGORYID 
   WHERE C.CATEGORYTEXT = ?
   AND R.STATUS = ?`;

  dbh.get(pageDataQuery, [req.baseUrl, CURRENT], (err, row) => {
    if (err) {
      return console.error(err.message);
    }

    //if (row) {
    if (typeof(row) !== "undefined") {
      
      // TODO pass in the categoryData object	    
      //console.log(row);	
 
      req.categoryData.categoryText = row.CATEGORYTEXT;
      req.categoryData.categoryId = row.CATEGORYID;
      req.categoryData.parentId = row.PARENT; 
      req.categoryData.blockTitle = row.TITLE;
      req.categoryData.blockId = row.BLOCKID; 
      req.categoryData.created = row.CREATED;
      req.categoryData.username = row.USERNAME; // who created this revision. not the logged in user
      req.categoryData.revisionText = row.TEXT;
      req.categoryData.revisionId = row.REVISIONID;
      req.categoryData.state = FOUND;
 
      // send back a 200 response and the json object
      //res
      //  .status(200)
      //  .set('Content-Type', 'text/plain')
      //  .send(req.categoryData)
      //  .end();       

      // to browser for debugging 
      res.render('page', { 
        categorytext : row.CATEGORYTEXT,
        categoryid : row.CATEGORYID, 
        parentid : row.PARENT, 
        title : row.TITLE, 
        blockid : row.BLOCKID, 
        revisionid : row.REVISIONID, 
        created : row.CREATED, 
        username : row.USERNAME, 
        text : row.TEXT, 
        //state : req.CategoryData.state,
        //state : "state",
        state : req.categoryData.state,
        user : req.user,
        //levels : req.categoryData.levels,
        levels : createBreadCrumbs(req.categoryData.levels),
      });

     } else {

       req.categoryData.state = NOTFOUND;
       //check for logged in
       
       // require('connect-ensure-login').ensureLoggedIn();

      /////////
      if (!req.isAuthenticated || !req.isAuthenticated()) {
         if (req.session) {
           req.session.returnTo = req.originalUrl || req.url;
         }

         return res.redirect('/users/login');
      }
      /////////

       createCategory(req,res);

       res.redirect(req.url);
       //res.render('page', {
       // });

     } // else
	     
    });

 });

function createCategory(req,res) {
  
  let candidateCategory = "";
  let parentId = 1;
  console.log(req.categoryData.levels);

  req.categoryData.levels.shift();

  for (let i = 0; i < req.categoryData.levels.length; i++) {

    if (i === 0) {

      candidateCategory = candidateCategory + "/" + req.categoryData.levels[i];

    } else if (i === req.categoryData.levels.length -1) {
      candidateCategory = candidateCategory + "/" + req.categoryData.levels[i];

    } else {

      candidateCategory = candidateCategory + req.categoryData.levels[i] + "/";
    }
    
    console.log(i+" candidateCategory is "+candidateCategory);

    const findCatQuery = `SELECT CATEGORYID FROM CATEGORIES WHERE CATEGORYTEXT = ?`;
    
    dbh.get(findCatQuery, [candidateCategory], (err, row) => {

      if (err) {
       return console.error(err.message);
      }

      //console.log("typeof row is "+typeof(row));
      //if (row)
      if (typeof(row) !== "undefined") {

        //console.log(`for candidate ${candidateCategory} id ${row.CATEGORYID}`)
        //console.log("row exists- typeof row is "+typeof(row));

        parentId = row.CATEGORYID;
        console.log("parentid is now "+parentId);

      } else {

        console.log(`category ${candidateCategory} does not exist`);
  
        /*
        let userId;
        //let userID = req.user.USERID;
        if (typeof(req.user) !== "undefined") { 
           console.log("userID is "+req.user.USERID);
           userId = req.user.USERID;
        }*/

/*
        let candidateObject = {
           candidateId : null,
           blockId : null,
           revisionId : null,
           categoryText : null,
           revisionText : null,
              userId: userId,
        };
*/

     /* When a category is created we need to also create an initial Revision, Block, Revision, and Blocks_Revisions */
     dbh.beginTransaction(function(err, transaction) {
        dbh.run(`INSERT INTO CATEGORIES (CATEGORYTEXT,PARENT,CREATED) VALUES (?,?,DATETIME('now'))`, [candidateCategory, parentId], (err) => {
          if (err) {
            console.error(err.message);
          }
          //console.log(`A row has been inserted into categories with rowid ${this.lastID}`);
         transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	 });
      });

/*
        const findLastCategory = `SELECT CATEGORYTEXT, CATEGORYID FROM CATEGORIES WHERE CATEGORYID = last_insert_rowid()`;
  
        // In case you want to keep the callback as the 3rd parameter, you should set param to "[]"
        dbh.get(findLastCategory, (err, row) => {

          if (err) {
            return console.error(err.message);
          }

          // console.log(row);

          if (typeof(row) !== "undefined") {

	    console.log(row);
	    console.log(`A row has been inserted. categoryText is ${row.categoryText}`);

            candidateObject.candidateId = row.CATEGORYID;
            candidateObject.categoryText = row.CATEGORYTEXT;

          } else {
            console.log(`category row did NOT change`);
          
            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });

         }

        }); */

        dbh.run(`INSERT INTO BLOCKS (TITLE, CREATED, TYPE) VALUES ((SELECT CATEGORYTEXT FROM CATEGORIES WHERE CATEGORYID = last_insert_rowid()), DATETIME('now'), 1)`, (err) => {
          if (err) {
            return console.error(err.message);
            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });

          }

        });

        dbh.run(`INSERT INTO BLOCKS_CATEGORIES (BLOCKID, CATEGORYID) VALUES ((SELECT MAX(BLOCKID) FROM BLOCKS),(SELECT MAX(CATEGORYID) FROM CATEGORIES))`,  (err) => {
          if (err) {
            return console.error(err.message);

            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });

          }

          console.log(`A row has been inserted into blocks_categories with rowid ${this.lastID}`);
        });

        dbh.run(`INSERT INTO REVISIONS (TEXT, BLOCKID, CREATED, USERID) VALUES ("", (SELECT MAX(BLOCKID) FROM BLOCKS),DATETIME("now"), ? )`, [req.user.USERID], (err) => {
          if (err) {

            return console.error(err.message);
           
            transaction.rollback(function(err) {
              if (err) return console.log(`Error: ${err.message}`);
	    });
          }

          console.log(`A row has been inserted into revisions with rowid ${this.lastID}`);
        });

        transaction.commit(function(err) {
          if (err) return console.log(`Error: ${err.message}`);
          console.log(`creation of new Category ${req.categoryData.categoryText}`);
	});
     });

     } // else
    });
    
  }

}

module.exports = router;
