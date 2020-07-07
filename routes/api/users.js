const express = require('express'); // bring in express
const router = express.Router(); // to use express router
const { check, validationResult } = require('express-validator');

const bcrypt = require('bcryptjs');
const gravatar = require('gravatar');
const User = require('../../models/User'); // bring in the User model

const jwt = require('jsonwebtoken');
const config = require('config');

// @route   POST api/users
// @desc    Register user
// @access  Public (don't need a token to access)
// Now we want to be able to send the data to this route.
// We need to send a nema, email, and a password in order to register a user.
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
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
      if (user) {
        // if dup user
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }
      // Get users gravatar
      const avatar = gravatar.url(email, {
        s: '200', // size
        r: 'pg', // rating
        d: 'mm', // default image. ex) '404' page not found
      });

      user = new User({
        name,
        email,
        avatar,
        password,
      });

      // Encrypt password (anything that retuns promise, we add 'await')
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      // Save a user
      await user.save();

      // Return jsonwebtoken:
      // The reason we are returning jsonwebtoken is because in the front end, when a user registers,
      // we want him to logged in right away. And in order to be logged in, we have to have that token.
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
