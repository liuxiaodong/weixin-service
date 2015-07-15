var urllib = require('urllib');
var util = require('./util');
var wrapper = util.wrapper;

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
  urllib.request(url, opts, wrapper(callback));
};