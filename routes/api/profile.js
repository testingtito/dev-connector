const express = require('express'); // bring in express
const router = express.Router(); // to use express router

const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

const { check, validationResult } = require('express-validator');

const request = require('request');
const config = require('config');

// api/profile은 모든 profile을 return. 우리가 원하는 것은 특정 profile based on user id and token
// @route   GET api/profile/me
// @desc    Get current user's profile.
// @access  Private
router.get('/me', auth, async (req, res) => {
  // we are using mongoose here and it returns a promise, so use async-await
  try {
    const profile =
      // 여기서 왼쪽의 user는 Profile model에 있는 user field. so we set that to the user id that
      // comes in when the token
      await Profile.findOne({ user: req.user.id }).populate('user', ['name', 'avatar']);
    // now we also want to pupulate this with the name of the user and the avatar.
    // These are in the User model, not in Profile model. so use populate method to add that
    // stuff to this equery.
    // so populate from user. second parameter is the array of fields that we want to bring in.

    // Check if there is no profile
    if (!profile) {
      return res.status(400).json({ msg: 'There is no profile for this user' });
    }
    res.json(profile); // if there is profile
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/profile/
// @desc    Create or update user profile
// @access  Private
router.post('/', [auth, [check('status', 'Status is required').not().isEmpty(), check('skills', 'Skill is required').not().isEmpty()]], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { company, website, location, bio, status, githubusername, skills, youtube, facebook, twitter, instagram, linkedin } = req.body;

  // Build profile object
  const profileFields = {};
  profileFields.user = req.user.id; // gettting user in Profile Model
  if (company) profileFields.company = company;
  if (website) profileFields.website = website;
  if (location) profileFields.location = location;
  if (bio) profileFields.bio = bio;
  if (status) profileFields.status = status;
  if (githubusername) profileFields.githubusername = githubusername;
  if (skills) {
    // 현재 skills는 comma separated list, so we need to convert it to an arry
    profileFields.skills = skills.split(',').map((skill) => skill.trim());
  }

  // Build social object
  profileFields.social = {};
  profileFields.user = req.user.id; // gettting user in Profile Model
  if (youtube) profileFields.social.youtube = youtube;
  if (twitter) profileFields.social.twitter = twitter;
  if (facebook) profileFields.social.facebook = facebook;
  if (linkedin) profileFields.social.linkedin = linkedin;
  if (instagram) profileFields.social.instagram = instagram;

  try {
    let profile = await Profile.findOne({ user: req.user.id });
    if (profile) {
      // Update
      profile = await Profile.findOneAndUpdate(
        { user: req.user.id }, // finds by
        { $set: profileFields },
        { new: true }
      );
      return res.json(profile); // return a whole profile
    }

    // Create (if not found)
    profile = new Profile(profileFields);

    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profile/
// @desc    Get all profiles
// @access  Public
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']);
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/profile/user/:user_id
// @desc    Get all profiles by user ID
// @access  Public
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile =
      await Profile.findOne({ user: req.params.user_id }).populate('user', ['name', 'avatar']);
    if (!profile) return res.status(400).json({ msg: 'Profile not found' });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind == 'ObjectId') {
      return res.status(400).json({ msg: 'Profile not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/profile/
// @desc    Delete profile, user & posts
// @access  Private
router.delete('/', auth, async (req, res) => {
  try {
    // @todo - remove users posts

    // Remove profile
    // we don't need to get anything, so we don't need a variable here.
    await Profile.findOneAndRemove({ user: req.user.id });

    // Remove user
    await User.findOneAndRemove({ _id: req.user.id });

    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/profile/experience
// @desc    Add profile experience
// @access  private
router.put
  ('/experience',
    [
      auth,
      [
        check('title', 'Title is required').not().isEmpty(),
        check('company', 'company is required').not().isEmpty(),
        check('from', 'From date is required').not().isEmpty(),
      ]
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        company,
        location,
        from,
        to,
        currrent,
        description
      } = req.body

      // this will create an object with the data that the user submits
      const newExp = {
        title,
        company,
        location,
        from,
        to,
        currrent,
        description
      }
      try {
        // we first have to fetch the profile, so get the profile of the user
        const profile = await Profile.findOne({ user: req.user.id });

        // add at the beginning
        profile.experience.unshift(newExp);

        await profile.save();
        res.json(profile); // this will help us in the front end later on
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });

// @route   DELETE api/profile/experience/:exp_id
// @desc    Delete experience from profile
// @access  private
router.delete
  ('/experience/:exp_id',
    auth,
    async (req, res) => {
      try {
        // we first have to fetch the profile by user id
        const profile = await Profile.findOne({ user: req.user.id });

        // We need to get the correct experience to remove
        // Get remove index (finding matching expeirence id)
        const removeIndex = profile.experience.map(item => item.id).indexOf(req.params.exp_id);

        // remove the one in index 1
        profile.experience.splice(removeIndex, 1);

        await profile.save();

        // send back our response
        res.json(profile); // this will help us in the front end later on
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });


// @route   PUT api/profile/education
// @desc    Add profile education
// @access  private
router.put
  ('/education',
    [
      auth,
      [
        check('school', 'school is required').not().isEmpty(),
        check('degree', 'company is required').not().isEmpty(),
        check('fieldofstudy', 'Field of study is required').not().isEmpty(),
        check('from', 'From date is required').not().isEmpty(),
      ]
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        currrent,
        description
      } = req.body

      // this will create an object with the data that the user submits
      const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        currrent,
        description
      }
      try {
        // we first have to fetch the profile, so get the profile of the user
        const profile = await Profile.findOne({ user: req.user.id });

        // add at the beginning
        profile.education.unshift(newEdu);
        await profile.save();
        res.json(profile); // this will help us in the front end later on
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });

// @route   DELETE api/profile/education/:edu_id
// @desc    Delete education from profile
// @access  private
router.delete
  ('/education/:edu_id',
    auth,
    async (req, res) => {
      try {
        // we first have to fetch the profile by user id
        const profile = await Profile.findOne({ user: req.user.id });

        // We need to get the correct education to remove
        // Get remove index (finding matching expeirence id)
        const removeIndex = profile.education.map(item => item.id).indexOf(req.params.edu_id);

        // remove the one in index 1
        profile.education.splice(removeIndex, 1);

        await profile.save();

        // send back our response
        res.json(profile); // this will help us in the front end later on
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
    });

// @route   GET api/profile/github/:username
// @desc    Get user repos from github
// @access  Public (Viewing a profile is public. Anybody can see the profile)
router.get('/github/:username', async (req, res) => {
  try {
    const options = {
      uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
      method: 'GET',
      headers: { 'user-agent': 'node.js' }
    };
    request(options, (error, response, body) => {
      if (response.statusCode !== 200) {
        return res.status(404).json({ msg: 'No Github profile found' });
      }
      // body is just string like escaped quote like that, so we need to convert it to the object 
      // before we send it using JSON.stringify()
      res.json(JSON.parse(body));
    })
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
