/** @jsx React.DOM */

var React = require('react');

module.exports = Loader = React.createClass({displayName: "Loader",
  render: function(){
    return (
      React.createElement("div", {className: "loader " + (this.props.paging ? "active" : "")}, 
        React.createElement("img", {src: "svg/loader.svg"})
      )
    )
  }
});
