var express = require('express');
var router = express.Router();

// invoked for any requests passed to this router
router.use(function (req, res, next) {
  req.levels = req.baseUrl.split('/');
  next();
})

/* The root level category needs special treatment */
router.get('/', function(req, res, next) {
  console.log(req.levels);
  res.render('index', { title: 'Express Splat', levels : req.levels});
});

// XXX Ajax vs. browser

router.post('/category/:category_id', function(req, res, next) {
function createCategory() {}

router.post('/block/:block_id', function(req, res, next) {
});
function createBlock() {}

// put /block/:block_id
function editBlock() {}

// put /category/:category_id
function editCategory() {}

// get /block/:block_id
function getBlock() {}

// get /category/:category_id
function getCategory() {}

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
