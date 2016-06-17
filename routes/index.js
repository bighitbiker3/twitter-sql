
var express = require('express');
var router = express.Router();
var tweetBank = require('../tweetBank');

module.exports = function makeRouterWithSockets (io, client) {

  // a reusable function
  function respondWithAllTweets (req, res, next){
    client.query('SELECT tweets.content, tweets.id, users.name, users.pictureurl, tweets.rt FROM tweets INNER JOIN users ON tweets.userid = users.id', function (err, result) {
        if (err) return next(err); // pass errors to Express
        var tweets = result.rows;
        var sorted = tweets.sort(function(a,b){
          return a.id - b.id;
        });
        res.render('index', { title: 'Twitter.js', tweets: tweets, showForm: true});
      });
  }

  // here we basically treet the root view and tweets view as identical
  router.get('/', respondWithAllTweets);
  router.get('/tweets', respondWithAllTweets);

  // single-user page
  router.get('/users/:username', function(req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid WHERE name = $1', [req.params.username], function(err, result){
      if(err) return next(err);
      var tweets = result.rows;
      res.render('index', {title: 'Tweets by' + req.params.username, tweets: tweets});
    });
  });

  // single-tweet page
  router.get('/tweets/:id', function(req, res, next){
    client.query('SELECT * FROM tweets INNER JOIN users ON users.id = tweets.userid WHERE tweets.id =$1', [req.params.id], function(err , result){
      if(err) return next(err);
      var tweets = result.rows;
      res.render('index', {title: 'Tweets by' + req.params.username, tweets: tweets});
    });
    // var tweetsWithThatId = tweetBank.find({ id: Number(req.params.id) });
    // res.render('index', {
    //   title: 'Twitter.js',
    //   tweets: tweetsWithThatId // an array of only one element ;-)
    // });
  });

  // create a new tweet
  router.post('/tweets', function(req, res, next){
    client.query('SELECT users.id FROM users WHERE users.name = $1', [req.body.name], function(err, result){
      if(!result.rows[0]){
        client.query('INSERT INTO users (name, pictureurl) VALUES (\''+ req.body.name +'\', \'http://www.psdgraphics.com/file/brown-egg.jpg \') RETURNING *', function(err, result){
          if(err) return next(err);
          client.query('INSERT INTO tweets (content, userid) VALUES (\'' + req.body.content + '\','+result.rows[0].id+') RETURNING *', function(err, result){
            if(err) return next(err);
            var newTweet = result.rows[0];
            newTweet.name = req.body.name;
            io.sockets.emit('new_tweet', newTweet);
            res.redirect('/');
          });
        });
        console.log("Error avoided");
      }
      else{
        client.query('INSERT INTO tweets (content, userid, rt) VALUES (\'' + req.body.content + '\','+result.rows[0].id+', \'' + req.body.rt + '\') RETURNING *', function(err, result){
          if(err) return next(err);
          var newTweet = result.rows[0];
          newTweet.name = req.body.name;
          io.sockets.emit('new_tweet', newTweet);
          res.redirect('/');
        });
      }

    });
  });

  router.get('/tweets/:id/delete', function(req, res, next){
    client.query('DELETE FROM tweets WHERE tweets.id = ' + req.params.id, function(err, result){
      io.sockets.emit('delete_tweet', req.params.id);
    });
    res.redirect('/');
  });

  router.get('/tweets/:id/retweet', function(req,res, next){
    client.query('SELECT tweets.content FROM tweets WHERE tweets.id ='+req.params.id, function(err, result){
      if(err) return next(err);
      var tweet = result.rows[0].content;

    });
  });

  // // replaced this hard-coded route with general static routing in app.js
  // router.get('/stylesheets/style.css', function(req, res, next){
  //   res.sendFile('/stylesheets/style.css', { root: __dirname + '/../public/' });
  // });

  return router;
};
