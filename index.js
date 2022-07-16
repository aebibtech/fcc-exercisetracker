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
app.use(bodyParser.urlencoded({ extended: false }));

// Home Page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Mongoose
const goose = require('mongoose');
const MONGO_URI = "mongodb+srv://aebibtech:1234@cluster0.brnejx7.mongodb.net/exercise?retryWrites=true&w=majority" // process.env['MONGO_URI'];
try {
  goose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }, () => { console.log("Mongoose is connected.") });
} catch (e) {
  console.log("could not connect.")
}

// Schema and Model
const Schema = goose.Schema;
const exercisesSchema = new Schema({
  username: { type: String, required: true },
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
        if (err) return console.error(err);
        res.json(data);
      });
  })
  .post(async (req, res) => {
    let username = req.body.username;
    if (!username) {
      res.redirect("/");
    }

    let duplicate = await Exercises.findOne({ username: username });

    if (duplicate) {
      console.log("Duplicate Found:", duplicate.username, duplicate._id);
      res.json({ username: duplicate.username, _id: duplicate._id });
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
          if (err) return console.error(err);
          res.json({ username: username, _id: userObj._id });
        });

    }
  });

// POST /api/users/:_id/exercises
app.route("/api/users/:_id/exercises")
  .post((req, res) => {
    let _id = req.params._id;
    let description = req.body.description;
    let duration = Number(req.body.duration);
    let date = req.body.date;
    let dateObj;

    if (!date || new Date(date) == "Invalid Date") {
      dateObj = new Date(Date.now());
    } else {
      dateObj = new Date(date);
    }

    console.log(`POST /api/users/${_id}/exercises`);
    Exercises.updateOne({ _id: _id }, {
      $push: {
        log: {
          description: description,
          duration: duration,
          date: dateObj.toDateString()
        }
      }
    }, (err) => {
      if (err) return console.error(err);
    });

    let query = Exercises.findOne({ _id: _id });
    query.exec(
      (err, data) => {
        if (err) return console.error(err);
        // console.log("data.date: ", data.date);
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
app.get("/api/users/:_id/logs", async (req, res) => {
  let _id = req.params._id;
  const { from, to, limit } = req.query;

  await Exercises.findOne({ _id: _id }).exec(
    (err, data) => {
      if (err) return console.error(err);
      let logs;
      if (data.log) {
        logs = data.log.map((d) => {
          return {
            description: d.description,
            duration: d.duration,
            date: d.date
          };
        });
        // if from and to are supplied
        if ((new Date(from) != "Invalid Date" && new Date(to) != "Invalid Date") &&
          (from && to)) {
          logs = logs.filter((log) => {
            return new Date(log.date).getTime() >= new Date(from).getTime()
              && new Date(log.date).getTime() <= new Date(to).getTime();
          }).sort((a, b) =>
            new Date(a.date) - new Date(b.date)
          );
        }

        // if limit is supplied       
        if (limit > 0) {
          logs = logs.slice(0, limit);
        }

      } else {
        logs = [];
      }
      if (from && to) {
        res.json({
          username: data.username,
          from: new Date(from).toDateString(),
          to: new Date(to).toDateString(),
          count: logs.length,
          _id: data._id,
          log: logs
        });
      } else {
        res.json({
          username: data.username,
          count: logs.length,
          _id: data._id,
          log: logs
        });
      }
    }
  );
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
