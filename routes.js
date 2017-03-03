var express = require("express");
var User = require("./models/user");
var passport = require("passport");
var router = express.Router();
var multer = require('multer');
var portfolio= require("./models/portfolio");
var path = require('path');
var fs = require('fs');
var crypto = require('crypto');


/**
 * Multer Configuration
 */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const buf = crypto.randomBytes(16);
    cb(null, Date.now() + buf.toString('hex') + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage
});


router.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

///////home Page

router.get("/", function (req, res, next) {

  User.find({
    portfolio: {
      $not:{
       $size:0
     }
    }
  }).populate("portfolio").sort({
      createdAt: "ascending"//"descending"
    })
    .exec(function (err, students) { ////users
      if (err) {
        return next(err);
      }
      var totalStudents ;
      User.find({
        portfolio: {
          $not:{
           $size:0
         }
        }
      }).count(function(err, totalStudents){
          var  pageSize = 10,
            pageCount = Math.ceil(totalStudents/10),
            currentPage = 1,
            studentsArrays = [],
            studentsList = [];

          //  console.log("totalStudents: ",totalStudents);
          //  console.log("ALL pages: ",pageCount);
            //split list into groups
               while (students.length > 0) {
                   studentsArrays.push(students.splice(0, pageSize));
               }
               //set current page if specifed as get variable
               if (typeof req.query.page !== 'undefined') {
                 currentPage = +req.query.page;
               }
               //show list of students from group
               studentsList = studentsArrays[currentPage - 1];
          res.render("index", {
          //  users: users,
            students: studentsList, //current 10 students
            pageSize: pageSize,
            totalStudents: totalStudents,
            pageCount: pageCount,
            currentPage: currentPage
          });
        });
    });
});
////////////////////////////////////////////////////////////////////////////////
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    req.flash("info", "You must be logged in to see this page.");
    res.redirect("/login");
  }
}

router.post("/login", passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/login",
  failureFlash: true
}));
router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});
router.get("/signup", function (req, res) {
  res.render("signup");
});
router.get("/login", function (req, res) {
  res.render("login");
});
router.post("/signup", function (req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  User.findOne({
    username: username
  }, function (err, user) {
    if (err) {
      return next(err);
    }
    if (user) {
      req.flash("error", "User already exists");
      return res.redirect("/signup");
    }
    var newUser = new User({
      username: username,
      password: password
    });
    newUser.save(next);
    req.flash("info", "Registered Successfully!");
  });
}, passport.authenticate("login", {
  successRedirect: "/",
  failureRedirect: "/signup",
  failureFlash: true
}));
router.get("/users/:username", function (req, res, next){
  User.findOne({
    username: req.params.username
  }).populate("portfolio").exec(function (err, user) {
    if (err) {
      return next(err);
    }
    if (!user) {
      return next(404);
    }
    // console.log
    console.log(user);
    res.render("profile", {
      user: user
    });
  });
});


router.get("/edit", ensureAuthenticated, function (req, res) {
  res.render("edit");
});
router.post("/edit",upload.any(),  ensureAuthenticated, function (req, res, next) {
  req.user.displayName = req.body.displayname;
  req.user.bio = req.body.bio;
  if (req.files[0]) {
      req.user.profilePicture=req.files[0].filename;
  }
  req.user.save(function (err) {
    if (err) {
      next(err);
      return;
    }
    req.flash("info", "Profile updated!");
    res.redirect("/users/"+req.user.username);
  });
});

/////PORTFOLIO SECTION!
router.get("/createfolio", ensureAuthenticated, function (req, res) {
  res.render("createfolio");
});

router.post("/createfolio", upload.any(), ensureAuthenticated, function (req, res, next) {
  req.user.realName=req.body.rname;
  if(req.body.link){
    new portfolio({
          worktype: true ,
          value: req.body.link
        }).save((err, data) =>{
          if(err){
            throw err;
          }
          req.user.portfolio.push(data);
          req.user.save((err) =>{
            console.log('GD link');
          })
        });
  }
    /////////////////////////
    if (!req.files[1]) {
    if(req.files[0]){
      new portfolio({
      worktype: false ,
      value: req.files[0].filename
      }).save((err, data) =>{
            if(err){
              throw err;
            }
            req.user.portfolio.push(data);
            req.user.save((err) =>{
              console.log('GD SCREENSHOT');
              req.flash("info", "Your portfolio was successfully created!");
                      res.redirect("/users/"+req.user.username);
            })
          });
        }
  } else {
    req.user.profilePicture = req.files[0].filename;
    new portfolio({
    worktype: false ,
    value: req.files[1].filename
    }).save((err, data) =>{
          if(err){
            throw err;
          }
      req.user.portfolio.push(data);
      req.user.save((err) =>{
        console.log('GD SCREENSHOT');
        req.flash("info", "Your portfolio was successfully created!");
                res.redirect("/users/"+req.user.username);
      })
    })
  }
});

router.get("/addwork", ensureAuthenticated, function (req, res) {
  res.render("addwork");
});

router.post("/addwork", upload.any(), ensureAuthenticated, function (req, res, next) {
  if(req.body.link){
    var f= new portfolio(
    {worktype: true, value: req.body.link}
    );
    req.user.portfolio.push(   f );
    console.log("LINK:",req.body.link);
  }

  if(req.files[0]){
    var f2= new portfolio({
      worktype: false,
      value: req.files[0].filename,
     });
    req.user.portfolio.push(  f2 );
    console.log("SCREENSHOT:",req.files[0].filename);
    console.log("f2value,",
    f2.value);
  }

  req.user.save(function (err) {
    if (err) {
      next(err);
      return;
    }
    req.flash("info", "Your work was successfully added!");
    res.redirect("/users/"+req.user.username);
  });
});


module.exports = router;
