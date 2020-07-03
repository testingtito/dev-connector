const express = require('express'); // bring up the express

const app = express(); // initialize app variable with express

// create a single endpoint. res.send() sends data to the browser
app.get('/', (req, res) => res.send('API Running'));

// look for the environment variabled called 'PORT'to use when we deploy to Heroku
// that's where it's gonna get the port number. Now locally we want to run it on port 5000.
// So basically there's no environment variables set, it will just go default to 5000.
const PORT = process.env.PORT || 5000;

// if we want something to happen once it coneects
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));

