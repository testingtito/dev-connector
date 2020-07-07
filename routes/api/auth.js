const express = require('express'); // bring in express
const router = express.Router(); // to use express router
const auth = require('../../middleware/auth');

const User = require('../../models/User');

const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

// @route   GET api/auth
// @desc    Test route
// @access  Public (don't need a token to access)
router.get('/', auth, async (req, res) => {
  // since we will make a call to database, use try-catch
  try {
    // since this is a protected route and we use the token which has the id
    // and in our middleware we set req.user = decoded.user (user in a token)
    // leave off the password by -password
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public (don't need a token to access)
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // 400 is a bad request
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body; // I don't want to do req.body.name, req.body.email etc.
    try {
      // See if user exists
      let user = await User.findOne({ email }); // check to see if there is user with the same email
      if (!user) {
        // if there is no matching user
        return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // make sure if the password matches
      // bcrypt has compare() method
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: 'Invalid Credentials' }] });
      }

      // Creat a payload
      const payload = {
        user: {
          // user가 save된 후에 mongo db에서는 _id 이지만, with mongoose they use an abstraction,
          // so you can use just id. we don't have to _id.
          id: user.id,
        },
      };

      jwt.sign(
        payload, // pass in the payload
        config.get('jwtSecret'), // pass in the secret
        { expiresIn: 360000 }, // optional, 보통은 3600sec
        (err, token) => {
          // callback, either error or token
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (error) {
      console.log(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
