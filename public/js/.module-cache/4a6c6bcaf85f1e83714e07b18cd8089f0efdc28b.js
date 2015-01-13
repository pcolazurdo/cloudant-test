/** @jsx React.DOM */

var React = require('react');

module.exports = Tweet = React.createClass({displayName: "Tweet",
  render: function(){
    var tweet = this.props.tweet;
    return (
      React.createElement("li", {className: "tweet" + (tweet.active ? ' active' : '')}, 
        React.createElement("img", {src: tweet.avatar, className: "avatar"}), 
        React.createElement("blockquote", null, 
          React.createElement("cite", null, 
            React.createElement("a", {href: "http://www.twitter.com/" + tweet.screenname}, tweet.author), 
            React.createElement("span", {className: "screen-name"}, "@", tweet.screenname)
          ), 
          React.createElement("span", {className: "content"}, tweet.body)
        )
      )
    )
  }
});
