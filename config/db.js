const mongoose = require('mongoose'); // bring in the mongoose
const config = require('config'); // bring in the config file
const db = config.get('mongoURI'); // grab mongoURI string from config file

// 아래와 같이 method를 만드는 이유는
// we need something to call within our server.js
const connectDB = async () => {
  try {
    // connect to mongo db
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false
    }); // this give us back promise
    console.log('MongoDB Connected..');
  } catch (err) {
    console.error(err.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
