var urllib = require('urllib');
var util = require('./util');
var wrapper = util.wrapper;
var extend = util.extend;

var mergeOpts = function (src, target){
  var options = {};
  extend(options, src);
  for (var key in target) {
    if (key !== 'headers') {
      options[key] = target[key];
    } else {
      if (target.headers) {
        options.headers = options.headers || {};
        extend(options.headers, target.headers);
      }
    }
  }
  return options;
};

/**
  * POST 请求
  */
exports.post = function(url, data, callback){
  var opts = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    dataType: 'json',
    data: data
  };
  opts = mergeOpts(this.defaultOpts, opts);
  urllib.request(url, opts, wrapper(callback));
};

/**
  * GET 请求
  */
exports.get = function(url, callback){
  var opts = {
    method: 'GET',
    dataType: 'json'
  };
  opts = mergeOpts(this.defaultOpts, opts);  
  urllib.request(url, opts, wrapper(callback));
};