/*
 circularCache.js: simple circular caching module.
 Created by: @pcolazurdo
 Created at: 20150119
*/

var cacheMemory = {};
var maxItems = 10;
cacheMemory.items = [];

module.exports = {
  addItem: function(content)
  {
    if (cacheMemory.items.length >= maxItems) {
      cacheMemory.items.pop();
    }
    cacheMemory.items.push(content);
  },

  getItems: function() {
    return cacheMemory.items;
  },

  flush: function() {
    cacheMemory.items = [];
  }  
};
