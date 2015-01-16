/** @jsx React.DOM */

var React = require('react');

module.exports = Tweet = React.createClass({
  render: function(){
    var tweet = this.props.tweet;
    //console.log("Tweet:", tweet);
    return (
      <span className={"tweet" + (tweet.active ? ' active' : '')}>
        <img src={tweet.avatar} className="avatar"/>
        <a href={"http://www.twitter.com/" + tweet.screenname}>{tweet.screenname}</a>
        <cite> at {tweet.date} </cite>
        <p className="tweetBody">{tweet.body}</p>
      </span>
    )
  }
});
