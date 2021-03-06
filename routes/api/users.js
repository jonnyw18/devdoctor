const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const secret = require('../../config/keys').secretOrKey;
const passport = require('passport');

// Load Input Validation
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');

// Load User Model
const User = require('../../models/User');

// @route   GET api/users/test
// @desc    Tests users route
// @access  Public
router.get('/test', (req, res) => res.json({msg: 'Users Works'}));

// @route   GET api/users/register
// @desc    Regiester a user
// @access  Public
router.post('/register', (req, res) => {
  const {isValid, errors} = validateRegisterInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({email: req.body.email}).then((user) => {
    if (user) {
      errors.email = 'Email already exists';
      return res.status(400).json(errors);
    } else {
      const avatar = gravatar.url(req.body.email, {
        s: '200', // Avatar size
        r: 'pg', // Rating of avatars
        d: 'mm' // Default image if avatar isnt found
      });
      const newUser = new User({name: req.body.name, email: req.body.email, avatar, password: req.body.password});
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err)
            throw err;
          newUser.password = hash;
          newUser.save().then(user => res.json(user)).catch(err => console.log(err));
        })
      })
    }
  })
})

// @route   GET api/users/login
// @desc    Login user / Returning the JWT token
// @access  Public
router.post('/login', (req, res) => {

  const {isValid, errors} = validateLoginInput(req.body);

  // Check Validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find the user by Email
  User.findOne({email}).then(user => {
    // Check for user
    if (!user) {
      errors.email = 'User not found'
      return res.status(404).send(errors)
    }

    // Check Password
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        // User Matched
        const payload = {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        } // Create JWT Payload

        // Sign Token
        jwt.sign(payload, secret, {
          expiresIn: 3600
        }, (err, token) => {
          res.json({
            success: true,
            token: 'Bearer ' + token
          })
        });
      } else {
        errors.password = 'Password incorrect'
        return res.status(400).json(errors)
      }
    })
  })
})

// @route   GET api/users/current
// @desc    Return Current User
// @access  Private
router.get('/current', passport.authenticate('jwt', {session: false}), (req, res) => {
  res.json(req.user)
})

module.exports = router;
