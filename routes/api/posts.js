const express = require('express'); // bring in express
const router = express.Router(); // to use express router
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');

const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private (we need to log in to post)
router.post(
  '/',
  [
    auth,
    [ // we do have the name and the avatar associated with the Post as well
      check('text', 'Text is required').not().isEmpty()
    ]
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');

      // when we create newPost object, we need to instantiate a newPost from the model.
      const newPost = new Post({
        text: req.body.text, // text is coming from the body, the rest are from user
        name: user.name, // we fetch name and avatar from database using id from the token
        avatar: user.avatar,
        user: req.user.id
      })

      const post = await newPost.save();
      res.json(post)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/posts
// @desc    Get all posts
// @access  Private (we not going to be able to see the post unless we are logged in)
// profiles are public, but posts are not
router.get(
  '/',
  auth,
  async (req, res) => {
    try {
      const posts = await Post.find().sort({ date: -1 }); // -1 is the most recent first

      res.json(posts)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   GET api/posts/:id
// @desc    Get post by ID
// @access  Private (we not going to be able to see the post unless we are logged in)
// profiles are public, but posts are not
router.get(
  '/:id',
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      // check if there is a post with that id. 404 is not found
      if (!post) {
        return res.status(404).json({ msg: 'Post not found' });
      }

      res.json(post)
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') { // if it's not a valid object id. ObjectId is not formatted id
        return res.status(404).json({ msg: 'Post not found:inside the catch' });
      }
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private 
// profiles are public, but posts are not
router.delete(
  '/:id',
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ msg: 'Post not found' });
      }
      // make sure that a user deleting a post owns the post: Check user
      if (post.user.toString() !== req.user.id) { // post.user is an object id. req.user.id is a logged in user
        return res.status(401).json({ msg: 'User not authorized' });
      }

      await post.remove();
      res.json({ msg: 'Post removed!' })
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') { // if it's not a valid object id. ObjectId is not formatted id
        return res.status(404).json({ msg: 'Post not found' });
      }
      res.status(500).send('Server Error');
    }
  }
);


// @route   PUT api/posts/like/:id (we need to know the id of the post that's being liked)
// @desc    Like a post
// @access  Private 
router.put(
  '/like/:id',
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      // Check if the post has already been liked
      if (post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
        return res.status(400).json({ msg: 'Bad Request: Post already liked' });
      }
      post.likes.unshift({ user: req.user.id });

      await post.save();
      res.json(post.likes)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   PUT api/posts/unlike/:id 
// @desc    Unlike a post
// @access  Private 
router.put(
  '/unlike/:id',
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      // Check if the post has already been liked. length===0 means that it's not been liked yet.
      if (post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
        return res.status(400).json({ msg: 'Bad Request: Post has not yet been liked' });
      }

      // Get remove index
      const removeIndex = post.likes.map(like => like.user.toString()).indexOf(req.user.id);

      post.likes.splice(removeIndex, 1);

      await post.save();
      res.json(post.likes)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/posts/comment/:id
// @desc    Comment on a post
// @access  Private (we need to log in to post)
router.post(
  '/comment/:id',
  [
    auth,
    [ // we do have the name and the avatar associated with the Post as well
      check('text', 'Text is required').not().isEmpty()
    ]
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text, // text is coming from the body, the rest are from user
        name: user.name, // we fetch name and avatar from database using id from the token
        avatar: user.avatar,
        user: req.user.id
      }

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   DELETE api/posts/comment/:id/:comment_id (we need to find the post by ID and then we need to know which comment to delete)
// @desc    Delete comment
// @access  Private 
// profiles are public, but posts are not
router.delete(
  '/comment/:id/:comment_id',
  auth,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      // Pull out comment
      const comment = post.comments.find(
        comment => comment.id === req.params.comment_id
        );

      // Make sure comment exists
      if (!comment) {
        return res.status(404).json({ msg: 'Comment does not exist' });
      }

      // Check user
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'User not authorized' });
      }

      // Get remove index
      const removeIndex = post.comments.map(comment => comment.user.toString()).indexOf(req.user.id);
      
      post.comments.splice(removeIndex, 1);

      await post.save();
      res.json(post.comments)
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

module.exports = router;


