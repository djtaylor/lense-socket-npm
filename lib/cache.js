/**
 * Module Dependencies
 */
var CacheManager = require('node-cache');
var cache        = new CacheManager();

// Main function
function LenseSocketCache() {}

/**
 * Check if cache key exists
 * @param {String} key The cache key
 */
LenseSocketCache.prototype.exists = function(key) {
  var value = cache.get(key);
  return (value == undefined) ? false : true;
}

/**
 * Get existing cache entry
 *
 * @param {String} key The cache key
 */
LenseSocketCache.prototype.get = function(key) {
  return cache.get(key);
}

/**
 * Set new cache entry
 *
 * @param {String} key The cache key
 * @param {Object} data The JSON data to cache
 * @param {Object} attrs Any additional attributes
 */
LenseSocketCache.prototype.set = function(key, data) {
	return cache.set(key, data, 3600);
}

/**
 * Delete cache entry
 *
 * @param {String} key The cache key
 */
LenseSocketCache.prototype.delete = function(key) {
  cache.del(key);
}

/**
 * Module Exports
 */

module.exports = new function() {
	return new LenseSocketCache();
};
