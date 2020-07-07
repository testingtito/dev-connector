const express = require('express'); // bring up the express
const connectDB = require('./config/db');
const app = express(); // initialize app variable with express

// Connect Database
connectDB();

// in order to res.body to work in users.js, we have to initialize the middleare 
// for the body parser. Now body parser comes with Express
// Init Middleware - this allows us to get the data in requst.body
app.use(express.json()); 

// create a single endpoint. res.send() sends data to the browser
app.get('/', (req, res) => res.send('API Running'));

// Define Routes
app.use('/api/users', require('./routes/api/users'));
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/profile', require('./routes/api/profile'));
app.use('/api/posts', require('./routes/api/posts'));

// look for the environment variabled called 'PORT'to use when we deploy to Heroku
// that's where it's gonna get the port number. Now locally we want to run it on port 5000.
// So basically there's no environment variables set, it will just go default to 5000.
const PORT = process.env.PORT || 5000;

// if we want something to happen once it coneects
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
