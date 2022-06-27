// Basic config
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// Middlewares
app.use(cors());
app.use(express.static('public'));
app.use("/", (req, res, next) => {
  console.log(req.method, req.path, req.ip);
  next();
});
app.use(bodyParser.urlencoded({extended: false}));

// Home Page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Mongoose
const goose = require('mongoose');
const MONGO_URI = process.env['MONGO_URI'];
goose.connect(MONGO_URI, { useNewUrlParser: true});

// Schema and Model
const Schema = goose.Schema;
const exercisesSchema = new Schema({
  username: {type: String, required: true},
  log: [{
    description: {
      type: String,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    date: {
      type: String,
      required: true
    }
  }]
});
const Exercises = goose.model("Exercises", exercisesSchema);

// Route Handlers

// POST /api/users - User Creation
// GET /api/users - Retrieve list of users
app.route("/api/users")
  .get(async (req, res) => {
    // prefix with '-' in select query to exclude field
    await Exercises.find({}).select("-log").
      exec((err, data) => {
      if(err) return console.error(err);
      res.json(data);
    });
  })
  .post(async (req, res) => {
    let username = req.body.username;
    if(!username) {
      res.send("supply a username");
    }
  
    let duplicate = await Exercises.findOne({username: username});
  
    if(duplicate) {
      console.log("Duplicate Found:", duplicate.username, duplicate._id);
      res.json({username: duplicate.username, _id: duplicate._id});
    } else {
      let newUser = new Exercises({
        username: username,
        log: []
      });
  
      await newUser.save();
  
      newUser = await Exercises.findOne({
        username: username
      }).select("-log")
        .exec((err, userObj) => {
          if(err) return console.error(err);
          res.json({username: username, _id: userObj._id});
        });
      
    }
  });

// POST /api/users/:_id/exercises
app.route("/api/users/:_id/exercises")
  .post( (req, res) => {
    let _id = req.params._id;
    let description = req.body.description;
    let duration = Number(req.body.duration);
    let date = req.body.date;
    let dateObj;
    
    if(!date || new Date(date) == "Invalid Date") {
      dateObj = new Date(Date.now());
    } else {
      dateObj = new Date(date);
    }
    
    console.log(`POST /api/users/${_id}/exercises`);
    Exercises.updateOne({_id: _id},{
      $push: {log: {
        description: description,
        duration: duration,
        date: dateObj.toDateString()
      }}
    }, (err) => {
      if(err) return console.error(err);
    });

    let query = Exercises.findOne({_id: _id});
    query.exec(
      (err, data) => {
      if(err) return console.error(err);
      console.log("data.date: ", data.date);
      res.json({
          username: data.username,
          description: description,
          duration: duration,
          date: dateObj.toDateString(),
          _id: data._id
        });
    });
  });

// GET /api/users/:_id/logs
app.get("/api/users/:_id/logs", (req, res) => {
  let _id = req.params._id;
  Exercises.findOne({_id: _id}).exec(
    (err, data) => {
      if(err) return console.error(err);
      let logs = data.log.map( (d) => {
          return {
            description: d.description,
            duration: d.duration,
            date: d.date
          };
        });
      res.json({
        username: data.username,
        count: logs.length,
        _id: data._id,
        log: logs
      });
    }
  );
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
