var request = require('request');
var getRawBody = require('raw-body');
var xml2js = require('xml2js');
var redis = require('redis');
var WXBizMsgCrypt = require('wechat-crypto');
var sha1 = require('sha1');
var _s = require('underscore.string');

var _toString = {}.toString;
// 如果传入一个获取 ticket 的函数，则每10分钟获取一次
// 定时获取 ticket 10分钟，定时获取 component_access_token 2 小时
var fetch_ticket_time = 600000, fetch_token_time = 7200000;
// 定时获取 access_token 的定时器;
var accessTokenTimer;

var WxService = function(options){
  
  if(!(this instanceof WxService)) {
    return new WxService(options);
  }

  // 托管凭证
  for(var k in options){
    if(options[k] && typeof options[k] == 'string') this.certificate(k, options[k]);
  }

  // 加解密
  if(this.token && this.encrypt_key && this.app_id){
    this.crypter = new WXBizMsgCrypt(this.token, this.encrypt_key, this.app_id);
  }

  // 建立 redis 客户端缓存凭证
  if(options.redis_options) {
    this.redisClient = redis.createClient(options.redis_options.port, options.redis_options.host, options.redis_options.options);
    if(options.redis_options.index){
      this.redisClient.select(options.redis_options.index);
    }
  }

  // ticket 可以是传入的一个原始字符串，也可以是一个获取 ticket 的函数
  // 或不传入 ticket，则无法获取 component_access_token 以后调用接口则需用传入 component_access_token 参数
  // 也可以交由 WxService 处理获取 ticket 的接口，WxService 获取到 ticket 后会缓存在系统
  if(!this.ticket && typeof options.ticket == 'function'){
      this.certificate('ticket', options.ticket, (options.fetch_ticket_time || fetch_ticket_time));
  }else if(!this.ticket && this.redisClient){
    getTicketFromRedis.call(this); 
  }

  // 若传入的 component_access_token 是函数或没有传入 component_access_token 但传入了 ticket。去取得component_access_token
  if(typeof options.component_access_token == 'function'){
    this.certificate('component_access_token', options.component_access_token, (options.fetch_token_time || fetch_token_time));
  }else if(!options.component_access_token){
    fetchComponentAccessToken.call(this, {retry_count: 10});
  }
}

/**                                                                                                                                                                                 
 * 解析微信 POST 的xml数据的中间件，若数据有加密则需要 token 和 encrypt_key                                                                                                         
 */
WxService.prototype.weixinParser = function(opts){
  var options = opts || {
    async: true,
    explicitArray: true,
    normalize: true,
    normalizeTags: true,
    trim: true,
    token: this.token
  };
  var self = this;
  return function(req, res, next){
    var signature = req.query["signature"];
    var timestamp = req.query["timestamp"];
    var nonce = req.query["nonce"];
    var sorted = [options.token, timestamp, nonce].sort();
    var origin = sorted.join("");
    var encoded = sha1(origin);
    if(encoded != signature){
      return next("validate failure");
    }

    getRawBody(req, {
      lenght: req.headers['content-length'],
      limit: '1mb',
      encodeing: 'utf8'
    }, function(err, str){
      if(err) return next(err);
      if(!str || str.length == 0)return next();
      xml2js.parseString(str, options, function(err, obj){
        if(err) return next(err);
        var data = Object.keys(obj.xml).reduce(function(memo, k){
          memo[_s.underscored(k)] = obj.xml[k][0];
          return memo;
        }, {});
        if(self.crypter && data.encrypt){
          var encrypt = data.encrypt;
          var message = self.crypter.decrypt(encrypt).message;
          xml2js.parseString(message, options, function(err, ret){
            var result = Object.keys(ret.xml).reduce(function(memo, k){
              memo[_s.underscored(k)] = ret.xml[k][0];
              return memo;
            }, {});
            req.weixin = result;
            next();
          });
        }else {
          req.weixin = data;
          next();
        }
      });
    });
  }
};

/**
 * 中间件验证消息的合法性
 */
WxService.prototype.validate = function(token){
  var token = token || this.token;
  return function(req, res, next){
    var signature = req.query["signature"];
    var timestamp = req.query["timestamp"];
    var nonce = req.query["nonce"];
    var sorted = [token, timestamp, nonce].sort();
    var origin = sorted.join("");
    var encoded = sha1(origin);
    if(encoded == signature){
      next();
    }else {
      next("validate failure");
    }
  }
};

WxService.prototype.enable = function(){
  return function(req, res){
    res.send(req.query.echostr);
  }
};

/**
 * 获取服务令牌 component_access_token
 */
WxService.prototype.getAccessToken = function(options, cb){  
  if(typeof options == 'function') {
    cb = options;
    options = {};
  }
  fetchComponentAccessToken.call(this, options, cb);
};

/**
 * 缓存 ticket 到 redis
 */
WxService.prototype.cacheTicket = function(component_verify_ticket, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  if(!component_verify_ticket) return cb("ticket missing");
  if(component_verify_ticket){
    this.ticket = component_verify_ticket;
    if(!this.component_access_token) fetchComponentAccessToken.call(this);
    if(this.redisClient){
      this.redisClient.setex("WX:ComponentVerifyTicket", 600, this.ticket);
    }
    cb();
  }
};

/**
 * 处理授权事件接收请求
 * @param req 
 * 废弃
 */
WxService.prototype.acceptNotice = function(req, cb){
  if(!this.crypter){
    throw new Error("need token and encrypt_key");
  }
  var self = this;
  getRawBody(req, {
    lenght: req.headers['content-length'],
    limit: '1mb',
    encodeing: 'utf8'
  }, function(err, str){
    if(err) return cb(err);
    if(!str || str.length == 0)return cb(null, null);
    xml2js.parseString(str, function(err, obj){
      if(err) return cb(err);
      var data = Object.keys(obj.xml).reduce(function(memo, k){
        memo[_s.underscored(k)] = obj.xml[k][0];
        return memo;
      }, {});
      if(data.encrypt){
        var encrypt = data.encrypt;
        var message = self.crypter.decrypt(encrypt).message;
        xml2js.parseString(message, function(err, ret){
          var result = Object.keys(ret.xml).reduce(function(memo, k){
            memo[_s.underscored(k)] = ret.xml[k][0];
            return memo;
          }, {});
          if(result.info_type == "component_verify_ticket"){
            self.ticket = result.component_verify_ticket;
            if(!self.component_access_token) fetchComponentAccessToken.call(this);
            if(self.redisClient){
              self.redisClient.setex("WX:ComponentVerifyTicket", 600, result.component_verify_ticket);
            }
          }
          cb(null, result);
        });
      }else {
        cb(null, data);
      }
    });
  });
};

WxService.prototype.decrypt = function(encrypt, cb){
  if(!this.crypter) return cb({message: 'No decrypt tool'});
  var message = this.crypter.decrypt(encrypt).message;
  xml2js.parseString(message, function(err, ret){
    if(err) return cb(err);
    var result = Object.keys(ret.xml).reduce(function(memo, k){
      memo[_s.underscored(k)] = ret.xml[k][0];
      return memo;
    }, {});
    cb(null, result);
  });
};

WxService.prototype.parseXml = function(xml, cb){
  if(!xml) return cb();
  xml2js.parseString(xml, function(err, ret){
    if(err) return cb(err);
    var result = Object.keys(ret.xml).reduce(function(memo, k){
      memo[_s.underscored(k)] = ret.xml[k][0];
      return memo;
    }, {});
    cb(null, result);
  });
};

/**
 * 获取预授权码
 */
WxService.prototype.preAuthCode = function(options, cb){
  if(typeof options == 'function') {
    cb = options;
    options = {};
  }
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  if(!component_access_token) return cb({errMsg: "component_access_token missing"});
  json.component_appid = options.app_id || this.app_id;
  if(!component_access_token || !json.component_appid) return cb({errMsg: "params invalid", info:json});
  var self = this;
  var fun = function(cb){
    request.post({
      url: "https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=" + component_access_token,
      json: json
    }, function(err, res, body){
      if(err) return cb(err);
      body = parseBody(body);
      if(self.redisClient){
        self.redisClient.setex("WX:PreAuthCode", body.expires_in, body.pre_auth_code);
      }
      return cb(null, body);
    });
  };
  if(self.redisClient){
    self.redisClient.get("WX:PreAuthCode", function(err, pre_auth_code){
      if(err) return cb(err);
      if(!pre_auth_code) return fun(cb);
      self.redisClient.ttl("WX:PreAuthCode", function(e, ttl){
        return cb(null, {pre_auth_code:pre_auth_code, ttl:ttl});
      });
    });
  }else {
    fun(cb);
  }
};

WxService.prototype.authorization = function(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  if(!component_access_token) return cb({errMsg: "component_access_token missing"});
  json.component_appid = options.app_id || this.app_id;
  json.authorization_code = options.authorization_code;
  if(!component_access_token || !json.component_appid || !json.authorization_code) return cb({errMsg: "params invalid", info:json});
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

WxService.prototype.refreshAccessToken = function(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  if(!component_access_token) return cb({errMsg: "component_access_token missing"});
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.authorizer_refresh_token = options.authorizer_refresh_token;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.authorizer_refresh_token) return cb({errMsg: "params invalid", info:json});
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

WxService.prototype.getAuthorizerInfo = function(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid) return cb({errMsg: "params invalid", info:json});
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

WxService.prototype.getAuthorizerOption = function(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  if(!component_access_token) return cb({errMsg: "component_access_token missing"});
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.option_name = options.option_name;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.option_name) return cb({errMsg: "params invalid", info:json});
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_option?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

WxService.prototype.setAuthorizerOption = function(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  if(!component_access_token) return cb({errMsg: "component_access_token missing"});
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.option_name = options.option_name;
  json.option_value = options.option_value;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.option_name || (json.option_value != 0 && !json.option_value)) return cb({errMsg: "params invalid", info:json});  
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_set_authorizer_option?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};


/**
 * 获取各种缓存的参数
 * params {String} type 需要获取或缓存的参数名称
 * params {String or Function} cert 需要缓存的凭证
 * params {Number} next_fetch_time 很多凭证都有时间限制，需要定时更新，若 cert 为 Function 则此参数有效，为间隔时间
 */
WxService.prototype.certificate = function(type, cert, next_fetch_time){
  if(arguments.length == 1) return this[type];
  var self = this;
  if(typeof cert == 'string'){
    self[type] = cert;
  }else if(typeof cert == 'function'){
    if(cert.length == 0){
      self[type] = cert();
    }else {
      cert(function(err, ret){
        if(!err && ret && typeof ret == 'string') {
          self[type] = ret;
        }
      });
    }
    next_fetch_time = Number(next_fetch_time);
    if(next_fetch_time){
      setTimeout(function(){
        self.certificate.call(self, type, cert, next_fetch_time);
      });
    }
  }else {
    throw new Error('second parameter need a string or function buf got a ' + typeof cert);
  }
}

function getTicketFromRedis(){
  var self = this;
  if(self.redisClient){
    self.redisClient.get("WX:ComponentVerifyTicket", function(e, component_verify_ticket){
      if(!e && component_verify_ticket){
        self.ticket = component_verify_ticket;
      }
    });
  }
}

function fetchComponentAccessToken (options, cb){
  if(typeof options == 'function'){
    cb = options;
    options = {};
  }
  cb = (typeof cb == 'function') ? cb : function(){};
  if(!options) options = {};
  var self = this;
  getAccessTokenFromRedis.call(self, function(err, ret){
    if(err) {
      //console.error(err);
      return cb(err);
    }
    if(ret && ret.ttl && ret.component_access_token){
      if(ret.ttl < 60){
        getAccessTokenFromWX.call(self, options, function(err, obj){
          if(err) {
            //console.error(err);
            return cb(err);
          }
          cb(null, obj.component_access_token);
          if(obj.expires_in) ttl = obj.expires_in * 1000 - 30 * 1000;
          clearTimeout(accessTokenTimer);
          accessTokenTimer = setTimeout(function(){ fetchComponentAccessToken.call(self, options); }, ttl);
        });
      }else {
        cb(null, ret.component_access_token);
        ttl = ret.ttl * 1000 - 30 * 1000;
        self.component_access_token = ret.component_access_token;
        clearTimeout(accessTokenTimer);
        accessTokenTimer = setTimeout(function(){ fetchComponentAccessToken.call(self, options); }, ttl);
      }
    }else {
      getAccessTokenFromWX.call(self, options, function(err, obj){
        if(err) {
          //console.error(err);
          return cb(err);
        }
        cb(null, obj.component_access_token);
        if(obj.expires_in) ttl = obj.expires_in * 1000 - 30 * 1000;
        clearTimeout(accessTokenTimer);
        accessTokenTimer = setTimeout(function(){ fetchComponentAccessToken.call(self, options); }, ttl);
      });
    }
  });
}

function getAccessTokenFromRedis(cb){
  if(!this.redisClient) return cb();
  var self = this;
  self.redisClient.ttl("WX:ComponentAccessToken", function(err, ttl){  
    if(err) return cb(err);
    self.redisClient.get("WX:ComponentAccessToken", function(err, ac){
      if(err) return cb(err);
      return cb(null, {ttl:ttl, component_access_token:ac});
    });
  });
}

function getAccessTokenFromWX(options, cb){
  cb = (typeof cb == 'function') ? cb : function(){};
  var json = {};
  json.component_appid = options.app_id || this.app_id;
  json.component_appsecret = options.app_secret || this.app_secret;
  json.component_verify_ticket = options.ticket || this.ticket;
  var self = this;
  if(!this.ticket && options.retry_count){
    options.retry_count--;
    return setTimeout(function(){ getAccessTokenFromWX.call(self, options, cb); }, 1000);
  }
  if(!json.component_appid || !json.component_appsecret || !json.component_verify_ticket){
    return cb({errMsg: 'params invalid', info: json});
  }
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_component_token",
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    if(!body) return cb("fail");
    if(body.errcode && body.errmsg){
      return cb(body);
    }
    if(body.component_access_token) {
      self.component_access_token = body.component_access_token;
      if(self.redisClient) {
        var exp = body.expires_in ? Number(body.expires_in) : 7200;
        self.redisClient.setex("WX:ComponentAccessToken", exp, body.component_access_token);
      }
    }
    return cb(null, body);
  });
}

function parseBody(body){
  try{
    if(typeof body == 'string') body = JSON.parse(body);
  }catch(e){
    //console.error(e);
  }
  return body;
}

module.exports = WxService;
