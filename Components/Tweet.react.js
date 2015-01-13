/** @jsx React.DOM */

var React = require('react');

module.exports = Tweet = React.createClass({
  render: function(){
    var tweet = this.props.tweet;
    return (
      <span className={"tweet" + (tweet.active ? ' active' : '')}>
        <blockquote>
          <img src={tweet.avatar} className="avatar"/>
          <p>{tweet.body}</p>
          <footer>
            <a href={"http://www.twitter.com/" + tweet.screenname}>{tweet.screenname}</a>
            <cite> at {tweet.date} </cite>
          </footer>
        </blockquote>
      </span>
    )
  }
});
