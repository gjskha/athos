var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3').verbose();
var path = require('path');

const dbfile = path.join(__dirname, '../db', 'database.db');
dbh = new sqlite3.Database(dbfile, (err) => {
  if (err) {
    return console.error(err.message);
  }
});

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  req.categoryData = {};
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
        // console.log("in pre, category exists");
        req.categoryData.CATEGORYID = row.CATEGORYID;
        console.log(req.CATEGORYID);
    } else {
        console.log("category does not exist");
        req.categoryData.CATEGORYID = null;
    } 	  
    
  });

  next();
});

/* The root level category needs special treatment */
router.get('/', function(req, res, next) {
   console.log(req.categoryData.CATEGORYID);

   console.log("in router get CATEGORYID is ");
   console.log(req.categoryData.CATEGORYID);

  const pageDataQuery = 
  `SELECT C.CATEGORYTEXT, 
          C.CATEGORYID, 
          C.PARENT, 
	  B.TITLE, 
	  B.BLOCKID, 
	  R.CREATED, 
	  U.USERNAME, 
	  R.TEXT 
   FROM USERS U 
   INNER JOIN REVISIONS R ON U.USERID = R.USERID 
   INNER JOIN BLOCKS B ON R.BLOCKID = B.BLOCKID 
   INNER JOIN BLOCKS_CATEGORIES X ON X.BLOCKID = B.BLOCKID 
   INNER JOIN CATEGORIES C ON C.CATEGORYID = X.CATEGORYID 
   WHERE C.CATEGORYTEXT = ?`;

  dbh.get(pageDataQuery, [req.baseUrl], (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    console.log(row);	  
    if (row) {
      	    
      res.render('page', { 
        categorytext : row.CATEGORYTEXT,
        categoryid : row.CATEGORYID, 
        parentid : row.PARENT, 
        title : row.TITLE, 
        blockid : row.BLOCKID, 
        created : row.CREATED, 
        username : row.USERNAME, 
        text : row.TEXT, 
        //state : req.CategoryData.state,
        state : "state is tbd logic",
        levels : req.categoryData.levels,
      });
    

     } else {

       createCategory(req,res);

     }
	     
    });

 });

// TBD: Ajax vs. browser
router.post('/category/:category_id', function(req, res, next) {
});

function createCategory(req,res) {
  
  let candidateCategory = "/";
  let parentId = 1;
  console.log(req.categoryData.levels);

  for (let i = 1; i < req.categoryData.levels.length; i++) {

    if (i == req.categoryData.levels.length -1) {
      //console.log(candidateCategory + req.categoryData.levels[i] );
      candidateCategory = candidateCategory + req.categoryData.levels[i] ;
    } else {

      //console.log(candidateCategory + req.categoryData.levels[i] + "/");
      candidateCategory = candidateCategory + req.categoryData.levels[i] + "/";
    }
    
    console.log("candidateCategory is "+candidateCategory);

    const findCatQuery = `SELECT CATEGORYID FROM CATEGORIES WHERE CATEGORYTEXT = ?`;
    
    dbh.get(findCatQuery, [candidateCategory], (err, row) => {

      if (err) {
       return console.error(err.message);
      }

      if (row) {

        parentId = row.CATEGORYID;
        console.log("parentid is now "+parentId);

      } else {

        console.log(`category ${candidateCategory} does not exist`);

        const createCategoryStmt = 
        `INSERT INTO CATEGORIES (CATEGORYTEXT,PARENT,CREATED) 
        VALUES (?,?,DATETIME('now'))`;
        dbh.run(createCategoryStmt, [candidateCategory, parentId], (err) => {
          if (err) {
            return console.error(err.message);
          }

          console.log(`A row has been inserted with rowid ${this.lastID}`);
      });

       const createBlockStmt = 
        `INSERT INTO BLOCKS (TITLE, CREATED, TYPE) VALUES ((SELECT MAX(CATEGORYTEXT) FROM CATEGORIES), DATETIME('now'), 1)`;
        dbh.run(createBlockStmt, [candidateCategory], (err) => {
          if (err) {
            return console.error(err.message);
          }
      });

      const createRelationStmt = 
        `INSERT INTO BLOCKS_CATEGORIES (BLOCKID, CATEGORYID) VALUES ((SELECT MAX(BLOCKID) FROM BLOCKS),(SELECT MAX(CATEGORYID) FROM CATEGORIES))`;
        //dbh.run(createRelationStmt, [], (err) => {
        dbh.run(createRelationStmt, null, (err) => {
          if (err) {
            return console.error(err.message);
          }
      });

     const createRevisionStmt = 
        `INSERT INTO REVISIONS (TEXT, BLOCKID, CREATED, USERID) VALUES ("", (SELECT MAX(BLOCKID) FROM BLOCKS),DATETIME("now"), ? )`;
        dbh.run(createRelationStmt, [req.user], (err) => {
          if (err) {
            return console.error(err.message);
          }

      });
    }
    // createBlock(req,res);
    });
  }
   res.render('page', {
     levels : req.categoryData.levels,
   });
    

   
}

router.post('/block/:block_id', function(req, res, next) {
});

function createBlock(blockTitle,blockType) {
  const createBlockQuery = 
    `insert into blocks (title,created,type) 
     values (?,datetime('now'),?)`
  	
  	

}

function createRevision(blockId,revisionText) {



}

// put /block/:block_id
function editBlock() {

}

// put /category/:category_id
function editCategory() {}

// get /block/:block_id
function getBlock() {}

// get /category/:category_id
function getCategory(requestedCategory) {
  const pageDataQuery = 
  `SELECT C.CATEGORYTEXT, 
          C.CATEGORYID, 
          C.PARENT, 
	  B.TITLE, 
	  B.BLOCKID, 
	  R.CREATED, 
	  U.USERNAME, 
	  R.TEXT 
   FROM USERS U 
   INNER JOIN REVISIONS R ON U.USERID = R.USERID 
   INNER JOIN BLOCKS B ON R.BLOCKID = B.BLOCKID 
   INNER JOIN BLOCKS_CATEGORIES X ON X.BLOCKID = B.BLOCKID 
   INNER JOIN CATEGORIES C ON C.CATEGORYID = X.CATEGORYID 
   WHERE C.CATEGORYTEXT = ?`;

  dbh.get(pageDataQuery, [requestedCategory], (err, row) => {
    if (err) {
      return console.error(err.message);
    }

    if (row) {
      res.render('page', { 
        categorytext : row.CATEGORYTEXT,
        categoryid : row.CATEGORYID, 
        parentid : row.PARENT, 
        title : row.TITLE, 
        blockid : row.BLOCKID, 
        created : row.CREATED, 
        username : row.USERNAME, 
        text : row.TEXT, 
        //state : req.CategoryData.state,
        state : "state is tbd logic",
        levels : req.categoryData.levels,
      });
    

      // return row;
    }	    
  });

  	
}

// get /category/:categoryid/childcategories
function getChildCategories() {}
// special case for root?

// get /category/:categoryid/block 
function getCategoryBlock() {}

// patch /block/:block_id/category/:category_id
function addCategoryToBlock()  {}
// multiple categories can have one block

// delete /block/:block_id/category/:category_id
function removeCategoryFromBlock() {}

// get /block/:block_id/categories 
function getBlockCategories() {} // getCategories –? {};
// (for all categories pointing to a block)


module.exports = router;
