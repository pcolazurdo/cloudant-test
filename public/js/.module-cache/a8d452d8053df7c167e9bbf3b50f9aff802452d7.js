/** @jsx React.DOM */

var React = require('react');
var Tweet = require('./Tweet.react.js');

module.exports = Tweets = React.createClass({displayName: "Tweets",

  // Render our tweets
  render: function(){

    // Build list items of single tweet components using map
    var content = this.props.tweets.map(function(tweet){
      return (
        React.createElement(Tweet, {key: tweet._id, tweet: tweet})
      )
    });

    // Return ul filled with our mapped tweets
    return (
      React.createElement("ul", {className: "tweets"}, content)
    )

  }

});
