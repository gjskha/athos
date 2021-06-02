/* Code pertaining to logging in and registering user accounts */
/* some code adapted from https://github.com/manjeshpv/node-express-passport-mysql */
var LocalStrategy   = require('passport-local').Strategy;
var bcrypt = require('bcrypt-nodejs');

module.exports = function(passport,connection) {
  
  // passport needs ability to serialize and unserialize users out of session
  passport.serializeUser(function(user, done) {
    done(null, user.userid);
  });
  
  passport.deserializeUser(function(id, done) {
    connection.get("select * from users where userid = ?", [id], function(err, rows){
      done(err, rows);
    });
  });
  
  /* sign up screen logic */
  passport.use(
    'local-signup',
    new LocalStrategy({
       usernameField : 'username',
       passwordField : 'password',
       passReqToCallback : true // allows us to pass back the entire request to the callback
     },
     function(req, username, password, done) {
       connection.get("select * from users where username = ?", [username], function(err, rows) {
         if (err)
           return done(err);
  	     
         if (rows) {
           return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
         } else {
           // if there is no user with that username create it
           var newUserStruct = {
             username: username,
             password: bcrypt.hashSync(password, null, null) 
           };
  
           var insertQuery = "insert into users ( username, password ) values (?,?)";
           connection.run(insertQuery, [newUserStruct.username, newUserStruct.password], function(err, rows) {

             //newUserStruct.id = this.lastID;
             newUserStruct.userid = this.lastID;
             return done(null, newUserStruct);

           });
         }
      });
    })
  );
  
  /* login screen logic */
  passport.use(
    'local-login',
    new LocalStrategy({
      //usernameField : 'USERNAME',
      //passwordField : 'PASSWORD',
      usernameField : 'username',
      passwordField : 'password',
      passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { 
      connection.get("select * from users where username = ?", [username], function(err, rows){
        if (err)
          return done(err);
  
        if (!rows) {
          return done(null, false, req.flash('loginMessage', 'No such user.')); 
        }
    
        // password is wrong
        if (!bcrypt.compareSync(password, rows.password))
          return done(null, false, req.flash('loginMessage', 'Wrong password.')); 
    
        // all is well, return successful user
        return done(null, rows);
      });
    })
  );
};
