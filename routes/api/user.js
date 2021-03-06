var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var utils = require('../../modules/http-utils');
var session = require('../../modules/session');

module.exports = function (models) {
  router.post('/', function (req, res) {
    saveUser(models.user, req.body, res);
  });

  router.post('/login', function (req, res) {
    models.user.findOne({
      username: req.body.username,
      pwHash: hashPassword(req.body.password)
    }).exec(function (err, user) {
      if (err) return utils.internalServerError(res);
      if (!user) return utils.notAuthorized(res, 'auth failed');

      session.login(req, user.username);
      utils.noContent(res);
    });
  });

  router.post('/logout', function (req, res) {
    if (!session.isLoggedIn(req)) {
      return utils.notAuthorized(res, 'not logged in');
    }

    session.logout(req);
    utils.noContent(res);
  });

  router.get('/', function (req, res) {
    models.user.find({}, '-pwHash -__v').exec(function (err, users) {
      if (err) return utils.internalServerError(res);

      utils.ok(res, users);
    });
  });

  router.get('/:id', function (req, res) {
    models.user.findById(req.params.id, '-pwHash -__v').exec(function (err, user) {
      if (err) return utils.internalServerError(res);
      if (!user) return utils.notFound(res);

      utils.ok(res, user);
    });
  });

  router.delete('/:id', function (req, res) {
    models.user.findByIdAndRemove(req.params.id).exec(function (err, user) {
      if (err) return utils.internalServerError(res);
      if (!user) return utils.notFound(res);

      utils.noContent(res);
    });
  });

  return router;
}

function saveUser (UserModel, user, res) {
  if (typeof user.username !== 'string' || typeof user.password !== 'string') {
    return utils.badRequest(res, 'missing or mistyped fields');
  }

  user.pwHash = hashPassword(user.password);
  delete user.password;

  new UserModel(user).save(function (err, newUser) {
    if (err) return utils.internalServerError(res);

    utils.created(res, {
      status : 'created',
      id : newUser._id
    });
  });
}

// store passwords as md5 checksums
function hashPassword (pw) {
  var hash = crypto.createHash('md5');
  hash.write(pw);
  return hash.digest('hex');
}
