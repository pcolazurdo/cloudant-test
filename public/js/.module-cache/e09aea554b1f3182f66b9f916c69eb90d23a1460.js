/** @jsx React.DOM */

var React = require('react');

module.exports = NotificationBar = React.createClass({displayName: "NotificationBar",
  render: function(){
    var count = this.props.count;
    return (
      React.createElement("div", {className: "notification-bar" + (count > 0 ? ' active' : '')}, 
        React.createElement("p", null, "There are ", count, " new tweets! ", React.createElement("a", {href: "#top", onClick: this.props.onShowNewTweets}, "Click here to see them."))
      )
    )
  }
});
