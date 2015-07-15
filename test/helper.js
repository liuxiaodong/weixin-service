var Q = require('q');
var _ = require('underscore');
var util = require('../lib/util');
var Weixin = require('../');
var Request = require('./request');

var __slice = [].slice;
var Helper = module.exports = function(options, url){
  var defaultOptions = {
    attrNameProcessors: 'keep',
    url: url
  };
  options = options || {};
  _.extend(defaultOptions, options);
  this.app = require('express')();
  this.wxs = new Weixin(defaultOptions);
  this.request = new Request(this.app);
};

Helper.prototype.handleWrapper = function(method, handleName, handle){
  var deferred = Q.defer();
  var wxs = this.wxs;
  handle = wxs[handleName](handle);
  var callbackWrapper = function(){
    try{
      handle.apply(wxs, arguments);
    }catch(e){
      return deferred.reject(e);
    }
    return deferred.resolve();
  };

  this.app[method](this.wxs.url, [wxs.bodyParserMiddlewares()], callbackWrapper);
  return deferred.promise;
};

Helper.prototype.requestWrapper = function(){
  var deferred = Q.defer();
  var args = __slice.call(arguments);
  var method = args.shift();
  var cb = args.pop();

  var callbackWrapper = function(){
    try{
      cb.apply({}, arguments);
    }catch(e){
      return deferred.reject(e);
    }
    return deferred.resolve();
  };

  args.push(callbackWrapper);
  this.request[method].apply(this.request, args);
  return deferred.promise;
};

Helper.prototype.doneWapper = function(){
  var args = __slice.call(arguments);
  var done = args.pop();
  Q.all(args).then(function(){
    done();
  }, function(err){
    done(err);
  });  
};