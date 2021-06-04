//////////////////////////////////////////////////////////////////////////////
// This file contains the application's routes.
// Each section contains the Express routes followed by the function(s) that
// run the SQL queries and associated tasks for those routes
//////////////////////////////////////////////////////////////////////////////

var ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;
var diff = require('simplediff');
var bbfy = require('bbfy');

/* global flags for requested Categories */
const NOTFOUND = 0;
const FOUND = 1;
const LOCKED = 2;
const DELETED = 3;

/* constants for Revisions */
const CURRENT = 0;
const ARCHIVE = 1;

module.exports = function(app, passport, connection) {

  /* code values used in the database tables */
  const conf = app.get('conf');

  ///////////////////////////////////////////////////////////////////////////
  // logging function called on every request
  ///////////////////////////////////////////////////////////////////////////
  app.use(async function (req, res, next) {

    console.log("==========================================================");
    let time = Date();
    console.log(`${time} : ${req.method} request for ${req.originalUrl}`);	

    /* collecting request-specific variables */
    req.categoryData = {
      state : null,
    };

    /* used for traversing category levels */
    req.categoryData.levels = req.path.split('/');
    req.categoryData.levels.shift();
    console.log(`levels are ${req.categoryData.levels}`);

    /* user info */
    if (req.user) {
      console.log(`login user is ${req.user.username}`);
      req.logged_in_user = req.user.username; 
    } else {
      console.log(`no login user for ${req.originalUrl}`);
      req.logged_in_user = false;
    }
  	
    next();
 
  });

  ///////////////////////////////////////////////////////////////////////////
  // Home page with 2nd level categories and information
  ///////////////////////////////////////////////////////////////////////////
  app.get('/', async function(req, res) {

    console.log(`rendering index template at home page.`);

    // the home page has an id of 1 	
    let rootChildren = await getChildCategories(1);

    res.render('index', {
      'title' : 'Welcome To Gwiki', 
      //'user' : req.user, 
      'logged_in_user' : req.logged_in_user, 
      'kids' : rootChildren,
    });
  });

  ///////////////////////////////////////////////////////////////////////////
  // Login and registration routes
  // 1) GET login form route
  // 2) POST login data to passport
  // 3) GET registration form route
  // 4) POST registration data to passport
  // 5) profile
  // 6) getUserContributions selects user's edits for profile page
  // 7) GET logout route
  //  
  // login logic uses some code/algorithms sourced from from:
  // https://github.com/manjeshpv/node-express-passport-mysql
  ///////////////////////////////////////////////////////////////////////////

  /* login form */
  app.get('/login', function(req, res) {
    console.log(`rendering login template.`);
    res.render('login', {
      logged_in_user : req.logged_in_user, 
      message: req.flash('loginMessage'), 
    });
  });

  /* process the login form */
  app.post('/login', 
    passport.authenticate('local-login', {
      //successRedirect : '/profile', 
      successRedirect : '/', 
      failureRedirect : '/login', 
      failureFlash : true // allow flash messages
    }),

    function(req, res) {
      if (req.body.remember) {
        req.session.cookie.maxAge = 1000 * 60 * 3;
      } else {
        req.session.cookie.expires = false;
    }
    res.redirect('/');
  });

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  /* registration screens */
  app.get('/register', function(req, res) {
    res.render('register', { message: req.flash('signupMessage') });
  });

  // process the signup form
  app.post('/register', 
    passport.authenticate('local-signup', {
      //successRedirect : '/profile', 
      successRedirect : '/', 
      failureRedirect : '/register', 
      failureFlash : true // allow flash messages
   })
  );

  app.get('/profile', ensureLoggedIn('/login'), async function(req, res) {
    // user contributions
    const results = await getUserContributions(req.user.userid);
    res.render('profile', {
      contributions : results,
      logged_in_user : req.logged_in_user,
    });
  });

  /* select user's contributions for profile page */ 
  async function getUserContributions(userId) {
    const userContribQuery = 
        `select r.created, c.categorytext
           from revisions r
     inner join users u on u.userid = r.userid
     inner join blocks b on r.blockid = b.blockid
     inner join blocks_categories x on x.blockid = b.blockid
     inner join categories c on c.categoryid = x.categoryid
     where u.userid = ?`;

    let result;
    try {
      result = await connection.query(userContribQuery, [userId]);
      console.log(result); 
    } catch (e) { 
      console.error(e.message); 
    }

    return result;
  }

  /////////////////////////////////////////////////////////////////////////////////
  // create a new Revision: 
  // 1. internal POST route.
  // 2. createRevision updates the database.
  /////////////////////////////////////////////////////////////////////////////////
  app.post('/internal/revisions', ensureLoggedIn('/login'),  function(req, res, next) {

    const revisionText = req.body.revision_text;
    const blockId = req.body.block_id;
	
    let revisionUser;
    if (req.user) {
      revisionUser = req.user.userid;
      //console.log("login user is "+revisionUser); 
    } else {
      console.log("No logged in user to commit revision"); 
    }

    if (revisionText && blockId && revisionUser) {
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

/* create revision: 
   params: 
   revisionText : a block of text
   blockId : a block that the revision belongs to
   revisionUser : who wrote it
*/
  async function createRevision(revisionText,blockId,revisionUser) {
   
    let result;
    try {
  
      const insertRevisionStmt = `INSERT INTO REVISIONS (TEXT,BLOCKID,CREATED,USERID,STATUS) VALUES (?,?,DATETIME('now'),?,?)`;
      // result = await connection.query(insertRevisionStmt, [revisionText,blockId,revisionUser,CURRENT]);
      
      const archiveOldRevisionStmt = `UPDATE REVISIONS SET STATUS = 1 WHERE BLOCKID = ?`;
   
       connection.beginTransaction(function(err, transaction) {
         /* update the old revisions to archived status */
         connection.run(archiveOldRevisionStmt, [blockId], (err) => {
           if (err) {
              console.error(err.message);
              transaction.rollback(function(err) {
                if (err) return console.log(`Error: ${err.message}`);
  	    });
            }
         }); 
   
         /* insert the new revision */ 
         connection.run(insertRevisionStmt, [revisionText,blockId,revisionUser,CURRENT], (err) => {
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
  
  /////////////////////////////////////////////////////////////////////////////////
  // Comparing revisions of a block
  // 1) GET route for diff 
  // 2) compareRevisions function for generating diff structure 
  /////////////////////////////////////////////////////////////////////////////////
  app.get('/internal/revisions/:left/:right', async function(req, res, next) {
  
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
  
  /* compareRevision
     params: left revisionId, right revisionId
     returns: diff structure */
  async function compareRevisions(left,right) {
  
    let result;
    let diffText;
  
    try {
      const revisionCompareQuery = `SELECT REVISIONID,TEXT,CREATED FROM REVISIONS WHERE REVISIONID = ? OR REVISIONID = ?`;
      result = await connection.query(revisionCompareQuery, [left,right]);
  
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
  
  /////////////////////////////////////////////////////////////////////////////////
  // Get all categories belonging to a given parent category 
  // 1) internal GET route
  // 2) getChildCategories() for running SQL query
  /////////////////////////////////////////////////////////////////////////////////
  app.get('/internal/categories/:category_id/children', async function(req, res, next) {
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
            .status('400')
            .set('Content-Type', 'text/plain')
            .send({ 'Error' : 'resource unavailable' }) 
            .end();
       }
  
     } else {
       res
         .status("403")
         .set('Content-Type', 'text/plain')
         .send({ 'Error' : 'Missing parameter' }) 
         .end();
     }
  });

  /* getChildCategories
     params: parentId
     returns: categoryText array */
  async function getChildCategories(parentId) {
    let result;
    try {
      // can be 0 or more results
      const getChildrenQuery = `SELECT CATEGORYTEXT FROM CATEGORIES WHERE PARENT = ?`;
      result = await connection.query(getChildrenQuery, [parentId]);
   
      result.forEach((item, index, arr) => {
        arr[index] = item.CATEGORYTEXT;
      }); 
    } catch (e) { 
      console.error(e.message); 
    }
    return result;
  }
  
  /////////////////////////////////////////////////////////////////////////////////
  // List Revisions 
  // 1. GET route for listing a Block's revisions
  // 2. listRevisions() to run SQL command for revisions
  /////////////////////////////////////////////////////////////////////////////////
  app.get('/internal/blocks/:block_id/revisions', async function(req, res, next) {
  
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
  
  /* list revisions
     params: blockId a block Id
     returns: array of revisionIds
  */ 
  async function listRevisions(blockId) {
    let result;
    const listRevisionsQuery = `SELECT R.REVISIONID,R.CREATED,U.username 
                                  FROM REVISIONS R, users U
                                 WHERE R.BLOCKID = ?
                                   AND U.userid = R.userid
                              ORDER BY R.CREATED DESC`;
  
   try {
      result = await connection.query(listRevisionsQuery, [blockId]);
    } catch (e) { 
      console.error(e.message); 
    }
    return result;
  }
  
  ///////////////////////////////////////////////////////////////////// 
  // Get a particular revision 
  // 1. GET internal route
  // 2. getRevision - get the revision
  /////////////////////////////////////////////////////////////////////
  app.get('/internal/blocks/:block_id/revisions/:revision_id', async function(req, res, next) {
  
    const blockId = req.params.block_id;
    const revisionId = req.params.revision_id;
  
      if ((typeof(blockId) !== 'undefined') && (typeof(revisionId) !== 'undefined')) {
    
      const result = await getRevision(blockId,revisionId); 
    
      if (typeof(result) !== 'undefined') {
        res
          .status('200')
          .set('Content-Type', 'text/plain')
          .send({ 
             "result" : result,
           }) 
           .end();
    
       } else {
          res
            .status('400')
            .set('Content-Type', 'text/plain')
            .send({ 'Error' : 'resource unavailable' }) 
            .end();
       }
  
     } else {
       res
         .status('403')
         .set('Content-Type', 'text/plain')
         .send({ 'Error' : 'Missing parameter' }) 
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
      result = await connection.query(getRevisionQuery, [blockId, revisionId]);
    } catch (e) { 
      console.error(e.message); 
    }
  
    return result;
  
  }
  /////////////////////////////////////////////////////////////////////////////
  // categories to/from blocks -- blocks can pointed at by categories 
  // 1. POST route to add categoryText to a blockId
  // 2. addCategoryToBlock()
  // 3. DELETE route to remove category from block
  // 4. removeCategoryFromBlock()
  /////////////////////////////////////////////////////////////////////////////
  app.post('/internal/blocks/:block_id/categories', ensureLoggedIn('/login'), async function(req, res, next) {
   
    const blockId = req.params.block_id;
    const categoryText = req.body.category_text;
  
    console.log(`user ${req.user.username} : modifying blockId ${blockId} with categoryText ${categoryText}`);

    if ((typeof(blockId) !== 'undefined') && (typeof(categoryText) !== 'undefined')) {
    
      const result = await addCategoryToBlock(blockId,categoryText); 
      console.log("result is "+result);
      //if (typeof(result) !== 'undefined') {
      if (result !== false) {
        res
          .status('201')
          .end();
      } else {
        res
          .status('404')
          //.set('Content-Type', 'text/plain')
          //.send({ 'Error' : 'category does not exist' }) 
          .end();
      }
     } else {
       res
         .status('403')
         //.set('Content-Type', 'text/plain')
         //.send({ 'Error' : 'Missing parameter' }) 
         .end();
     }
  });

  /* addCategoryToBlock()
     params: blockId block id, categoryText a URL
     returns: truthy or falsy */
  async function addCategoryToBlock(blockId, categoryText)  {
  
    const catExistsQuery = `SELECT CATEGORYID FROM CATEGORIES WHERE CATEGORYTEXT = ?`;
  
    let catResult;
    try {
      catResult = await connection.query(catExistsQuery, [categoryText]);
   
    } catch (e) { 
      console.error(e.message); 
    }
  
    console.log(catResult.length+" is length");
    //if (typeof(catResult) !== 'undefined') {
    if (catResult.length === 1) {
  
      console.error(`${categoryText} has categoryId ${catResult[0].CATEGORYID}`);
 
      const blockCategoryStmt = `INSERT INTO BLOCKS_CATEGORIES (BLOCKID,CATEGORYID) VALUES (?,?)`;
  
      let result;
      try {
        result = await connection.query(blockCategoryStmt, [blockId, catResult[0].CATEGORYID]);
      } catch (e) { 
        console.error(e.message);
        return false;  
      }
    
      return true;
    } else {
      return false;
    }
  }

/* multiple categories can have the same block */
app.delete('/internal/blocks/:block_id/category/:category_id', async function(req, res, next) {

  const blockId = req.params.block_id;
  const categoryId = req.params.category_id;

  if ((typeof(blockId) !== "undefined") &&  (typeof(categoryId) !== "undefined")) {
  
    const result = await removeCategoryFromBlock(blockId,categoryId);
  
    if (result) {
      res
        .status("204")
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

async function removeCategoryFromBlock(blockId,categoryId) {

  console.log(`removing category ${categoryId} from ${blockId}`);
  const deleteBlockCatRec =
    `delete from blocks_categories 
      where blockid = ? 
        and categoryid = ?`;

  let result = false;
  try {
    result = await connection.run(deleteBlockCatRec, [blockId, categoryId], (err) => { 
      if (err) {
        console.error(err.message);
      }
    }); 
  } catch (e) { 
    console.error(e.message); 
  }

  return result;
}

/////////////////////////////////////////////////////////////////////////////////
// Get the categories connected to a specific block of content 
// 1. internal GET route
// 2. getBlockCategories - perform the SQL query
/////////////////////////////////////////////////////////////////////////////////
app.get('/internal/blocks/:block_id/categories', async function(req, res, next) {
  const blockId = req.params.block_id;

  if (typeof(blockId) !== "undefined") {
  
    const result = await getBlockCategories(blockId); 
  
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
   `SELECT C.CATEGORYTEXT,C.CATEGORYID 
      FROM BLOCKS B 
     INNER JOIN BLOCKS_CATEGORIES X 
        ON B.BLOCKID = X.BLOCKID 
     INNER JOIN CATEGORIES C 
        ON C.CATEGORYID = X.CATEGORYID 
     WHERE B.BLOCKID = ?`;

  let result;
  try {
    result = await connection.query(blockCategoriesQuery, [blockId]);

  } catch (e) { 
    console.error(e.message); 
  }

  return result;

} 

/////////////////////////////////////////////////////////////////////////////////
// Search functionality
// 1. get route - get the search page
// 2. post route - process the input
// 3. performSearch - run the sql query
/////////////////////////////////////////////////////////////////////////////////
app.get('/search/', function(req, res, next) {
  console.log(req.user);
  res.render('search', {
    'logged_in_user' : req.logged_in_user,
  });
});

app.post('/search', async function(req, res, next) {
  const term = req.body.term;

  if (typeof(term) !== "undefined") {
  
    const results = await performSearch(term);
  
    if (typeof(results) !== "undefined") {
      res.render('search', {
        'logged_in_user' : req.logged_in_user,
        'term' : term,
        'results' : results,
      });

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

async function performSearch(term) {
  const searchQuery = 
    `SELECT C.CATEGORYTEXT FROM CATEGORIES C 
      INNER JOIN BLOCKS_CATEGORIES X ON C.CATEGORYID = X.CATEGORYID 
      INNER JOIN BLOCKS B ON X.BLOCKID = B.BLOCKID 
      INNER JOIN REVISIONS R ON R.BLOCKID = B.BLOCKID 
      WHERE R.TEXT LIKE '%'||?||'%' AND R.STATUS = ?`;

  console.log("Searching for "+term+" with status = "+conf.CURRENT);

  let result;
  try {
    result = await connection.query(searchQuery, [term, conf.CURRENT]);
  } catch (e) { 
    console.error(e.message); 
  }

  return result;
}

/////////////////////////////////////////////////////////////////////////////////
// Search functionality
// 1. getCategory - run the sql query
// 2. GET route for '*' - if we got this far, its a category
// 3. createCategory - iterate over the levels and create where necessary
/////////////////////////////////////////////////////////////////////////////////
async function getCategory(categoryText) {

  /* currently, this doesn't guarantee that it returns the "first" category if 
   * a block has more than one category */
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
   AND R.STATUS = ?
   ORDER BY R.REVISIONID ASC
   LIMIT 1`; // order / limit because BUG TBD

  results = await connection.query(pageDataQuery, [categoryText, conf.CURRENT]);

  results = results.shift(); 

  return results;
}

/* If we haven't matched a route by here, then it is a category */
app.get('*', async function(req, res, next) {

   console.log("In default handler req.url is "+ req.url+ " and path is "+req.path);

   let candidateUrl = req.path;

   const results = await getCategory(candidateUrl);

   if (typeof(results) !== 'undefined') {

     /* transform the text */
     results.renderedText = generateLinks(results.TEXT);
     results.renderedText = bbfyText(results.renderedText);
  
     /* get the category's children */
     results.kids = await getChildCategories(results.BLOCKID);

     res.render('page', { 
       'categorytext' : results.CATEGORYTEXT,
       'categoryid' : results.CATEGORYID, 
       'parentid' : results.PARENT, 
       'title' : results.TITLE, 
       'blockid' : results.BLOCKID, 
       'revisionid' : results.REVISIONID, 
       'created' : results.CREATED, 
       'text' : results.renderedText,
       'state' : conf.FOUND,
       'logged_in_user' : req.logged_in_user,
       'username' : results.username,
       'levels' : createBreadCrumbs(req.categoryData.levels),
       'kids' : results.kids, 
     });

   } else {
      console.log(req.originalUrl+" was not found, generating."); 	     
      req.categoryData.state = NOTFOUND;

      /* redirect browser to login */
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        if (req.session) {
          req.session.returnTo = req.originalUrl || req.url;
        }

       return res.redirect('/login');
     } 

       createCategory(req,res);

       console.log("in *, about to redirect to "+req.path); 	     
       res.redirect(req.path);
     } 
   });

  function createCategory(req,res) {
    
    let candidateCategory = "";
    let parentId = 1;
  
    for (let i = 0; i < req.categoryData.levels.length; i++) {
  
      /* construct the URL level by level */
      if (i === 0) {
        candidateCategory = candidateCategory + "/" + req.categoryData.levels[i];
      } else if (i === req.categoryData.levels.length -1) {
        candidateCategory = candidateCategory + "/" + req.categoryData.levels[i];
      } else {
        candidateCategory = candidateCategory + req.categoryData.levels[i] + "/";
      }
      
      console.log("createCategory: at the "+i+"th level candidateCategory is "+candidateCategory);
  
      const findCatQuery = `SELECT CATEGORYID FROM CATEGORIES WHERE CATEGORYTEXT = ?`;
      
      connection.get(findCatQuery, [candidateCategory], (err, row) => {
  
        if (err) {
         return console.error(err.message);
        }
  
        if (typeof(row) !== "undefined") {
  
          parentId = row.CATEGORYID;
          console.log("parentid is now "+parentId);
  
        } else {
  
          console.log(`category ${candidateCategory} does not exist`);
    
       /* When a category is created we need to also create an initial Revision, Block, Revision, and Blocks_Revisions */
       connection.beginTransaction(function(err, transaction) {
          connection.run(`INSERT INTO CATEGORIES (CATEGORYTEXT,PARENT,CREATED) VALUES (?,?,DATETIME('now'))`, [candidateCategory, parentId], (err) => {
            if (err) {
              console.error(err.message);
              transaction.rollback(function(err) {
                if (err) return console.log(`Error: ${err.message}`);
  	    });
  
            } else {
              console.log(`A row has been inserted into categories with rowid ${this.lastID}`);
            }
          });
  
          connection.run(`INSERT INTO BLOCKS (TITLE, CREATED, TYPE) VALUES ((SELECT CATEGORYTEXT FROM CATEGORIES WHERE CATEGORYID = last_insert_rowid()), DATETIME('now'), 1)`, (err) => {
            if (err) {
              return console.error(err.message);
              transaction.rollback(function(err) {
                if (err) return console.log(`Error: ${err.message}`);
  	    });
  
            }
  
          });
  
          connection.run(`INSERT INTO BLOCKS_CATEGORIES (BLOCKID, CATEGORYID) VALUES ((SELECT MAX(BLOCKID) FROM BLOCKS),(SELECT MAX(CATEGORYID) FROM CATEGORIES))`,  (err) => {
            if (err) {
              return console.error(err.message);
  
              transaction.rollback(function(err) {
                if (err) return console.log(`Error: ${err.message}`);
  	    });
  
            }
  
            console.log(`A row has been inserted into blocks_categories with rowid ${this.lastID}`);
          });
  
          //connection.run(`INSERT INTO REVISIONS (TEXT, BLOCKID, CREATED, USERID) VALUES ("", (SELECT MAX(BLOCKID) FROM BLOCKS),DATETIME("now"), ? )`, [req.user.USERID], (err) => {
          connection.run(`INSERT INTO REVISIONS (TEXT, BLOCKID, CREATED, USERID) VALUES ("", (SELECT MAX(BLOCKID) FROM BLOCKS),DATETIME("now"), ? )`, [req.user.userid], (err) => {
            if (err) {
  
              return console.error(err.message);
             
              transaction.rollback(function(err) {
                if (err) return console.log(`Error: ${err.message}`);
  	    });
            }
  
            console.log(`A row has been inserted into revisions with rowid ${this.lastID}`);
          });
  
          transaction.commit(function(err) {
            if (err) 
              return console.log(`Error: ${err.message}`);
  
            console.log(`creation of new Category ${req.categoryData.categoryText}`);
  	});
       });
  
       } // else
      });
      
    }
  
  }
  
  ////////////////////////////////////////////////////////////////////////////
  // Misc formatting functions
  ////////////////////////////////////////////////////////////////////////////

  /* generate links from wikilink code */
  function generateLinks(text) {
    const reg = /\b__([\w\/]+)__\b/g;
    let tags;
    if (text) {
      tags = text.replace(reg, "<a href=$1>$1</a>");
    } else {
      console.log("Warning, text sent to generateLinks() was undefined.");
    }
    return tags;
  }
  
  /* basic bbcode transformations */
  function bbfyText(text) {
    if (text) {
      const convert = bbfy.converter();
      text = convert(text);
    } else {
      console.log("Warning, text sent to bbfyText() was undefined.");
    } 
    return text;
  }
  
  /* navigating the hierarchy */
  function createBreadCrumbs(levels) {
  
    console.log(`createBreadCrumbs: ${levels}`);
 
    let crumbs = [];
    crumbs[0] = { "name" : "/", "href" : "/" };
    let crumbHref = ""; 
    for ( i = 0; i < levels.length; i++) {
      let href = crumbHref + "/" + levels[i];
      crumbs[i+1] = { "name" : levels[i], "href" : href };
      crumbHref = href;
    }
 
    console.log(`createBreadCrumbs returning ${crumbs}`); 
    return crumbs;
  }
};
