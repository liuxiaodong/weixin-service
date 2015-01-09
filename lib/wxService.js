var request = require('request');
var getRawBody = require('raw-body');
var xml2js = require('xml2js');
var redis = require('redis');
var WXBizMsgCrypt = require('wechat-crypto');
var sha1 = require('sha1');
var _s = require('underscore.string');

var _toString = {}.toString;
// 如果传入一个获取 ticket 的函数，则每10分钟获取一次
// 是否以获取到 ticket
var fetch_ticket_time = 1000 * 60 * 10, fetch_ticket_flag = false;
// 定时获取 access_token 的定时器;
var accessTokenTimer;

var wxService = function(options){
  if(!options.app_id || !options.app_secret){
    throw new Error('need app_id and app_secret');
  }
  wxService.app_id = options.app_id;
  wxService.app_secret = options.app_secret;

  if(options.token) wxService.token = options.token;
  if(options.encrypt_key) wxService.encrypt_key = options.encrypt_key;
  // 加解密
  if(options.token && options.encrypt_key){
    wxService.crypter = new WXBizMsgCrypt(options.token, options.encrypt_key, options.app_id);
  }

  // 把 ticket access_token 等凭证缓存到 redis
  if(options.redis_options) {
    wxService.redisClient = redis.createClient(options.redis_options.port, options.redis_options.host, options.redis_options.options);
  }

  // ticket 可以是传入的一个原始字符串，也可以是一个获取 ticket 的函数
  // 或不传入 ticket，则无法获取 component_access_token 以后调用接口则需用传入 component_access_token 参数
  // 也可以交由 wxService 处理获取 ticket 的接口，wxService 获取到 ticket 后会缓存在系统
  if(options.ticket){
    if(typeof options.ticket === 'string') {
      wxService.ticket = options.ticket;
      fetch_ticket_flag = true;
    }else if(typeof options.ticket === 'function'){
      getTicket(options.ticket);
    }
  }

  if(typeof options.component_access_token === 'string'){
    wxService.component_access_token = component_access_token;
  }else if(typeof options.component_access_token === 'function'){
    wxService.accessTokenFn = options.component_access_token;
    wxService.component_access_token = options.component_access_token(function(err, access_token){
      if(err) throw err;
      wxService.component_access_token = access_token;
    });
  }else if(!options.component_access_token){
    if(options.ticket){
      (function getAC(options){
        if(!fetch_ticket_flag) {
          if(wxService.fetch_ticket_count > 10) return console.error("fetch ticket fail");
          wxService.fetch_ticket_count = (wxService.fetch_ticket_count || 0) + 1;
          return setTimeout(function(){ getAC(options); }, 1000);
        }
        getComponentAccessToken(options);
      })(options);
    }else {
      if(wxService.redisClient){
        wxService.redisClient.get("ComponentVerifyTicket", function(err, ret){
          if(err) console.error(err);
          if(ret) {
            ret = JSON.parse(ret);
            wxService.ticket = ret.component_verify_ticket;
            getComponentAccessToken(options);
          }
        });
      }
    }
  }

  return wxService;
}


/**
 * 中间件验证消息的合法性
 */
wxService.validate = function(token){
  var token = token || this.token;
  return function(req, res, next){
    var signature = req.query["signature"];
    var timestamp = req.query["timestamp"];
    var nonce = req.query["nonce"];
    var sorted = [token, timestamp, nonce].sort();
    var origin = sorted.join("");
    var encoded = sha1(origin);
    if(encoded === signature){
      next();
    }else {
      next("validate failure");
    }
  }
};

wxService.enable = function(){
  return function(req, res){
    res.send(req.query.echostr);
  }
};

/**
 * 获取服务令牌 component_access_token
 */
wxService.getAccessToken = function(options, cb){  
  if(typeof options === 'function') {
    cb = options;
    options = {};
  }
  getComponentAccessToken(options, cb);
};

/**
 * 处理授权事件接收请求
 * @param req
 */
wxService.acceptNotice = function(req, cb){
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
    if(!str || str.length === 0)return cb(null, null);
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
          if(result.info_type === "component_verify_ticket"){
            self.ticket = result.component_verify_ticket;
            if(!self.component_access_token) getComponentAccessToken({});
            if(self.redisClient){
              self.redisClient.setex("ComponentVerifyTicket", 600, JSON.stringify(result));
            }
          }
          cb(null, result);
        });
      }else {
        cb(null, data);
      }
    });
  });
}

/**
 * 获取预授权码
 */
wxService.preAuthCode = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  if(!component_access_token || !json.component_appid) return cb({errMsg: "params invalid", info:options});
  var self = this;
  var fun = function(cb){
    request.post({
      url: "https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=" + component_access_token,
      json: json
    }, function(err, res, body){
      if(err) return cb(err);
      body = parseBody(body);
      if(self.redisClient){
        self.redisClient.setex("WX:PreAuthCode", body.expires_in, JSON.stringify(body));
      }
      return cb(null, body);
    });
  };
  if(self.redisClient){
    self.redisClient.get("WX:PreAuthCode", function(err, ret){
      if(err) return cb(err);
      if(!ret) fun(cb);
      if(ret) {
        self.redisClient.ttl("WX:PreAuthCode", function(e, ttl){
          ret = JSON.parse(ret);
          ret.expires_in = ttl;
          return cb(null, ret);          
        });
      }
    });
  }else {
    fun(cb);
  }
};

wxService.authorization = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorization_code = options.authorization_code;
  if(!component_access_token || !json.component_appid || !json.authorization_code) return cb({errMsg: "params invalid", info:options});
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

wxService.refreshAccessToken = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.authorizer_refresh_token = options.authorizer_refresh_token;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.authorizer_refresh_token) return cb({errMsg: "params invalid", info:options});
  request.post({
    url: "https:// api.weixin.qq.com /cgi-bin/component/api_authorizer_token?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

wxService.getAuthorizerInfo = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid) return cb({errMsg: "params invalid", info:options});  
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

wxService.getAuthorizerOption = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.option_name = options.option_name;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.option_name) return cb({errMsg: "params invalid", info:options});  
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/ api_get_authorizer_option?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

wxService.setAuthorizerOption = function(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  var component_access_token = options.component_access_token || this.component_access_token;
  json.component_appid = options.app_id || this.app_id;
  json.authorizer_appid = options.authorizer_appid;
  json.option_name = options.option_name;
  json.option_value = options.option_value;
  if(!component_access_token || !json.component_appid || !json.authorizer_appid || !json.option_name || !json.option_value) return cb({errMsg: "params invalid", info:options});  
  request.post({
    url: "https://api.weixin.qq.com/cgi-bin/component/ api_set_authorizer_option?component_access_token=" + component_access_token,
    json: json
  }, function(err, res, body){
    if(err) return cb(err);
    body = parseBody(body);
    return cb(null, body);
  });
};

function getTicket(fn){
  wxService.ticket = fn(function(err, ticket){
    fetch_ticket_flag = true;
    if(err) console.log(err);
    if(ticket) wxService.ticket = ticket;
  });
  if(wxService.ticket) fetch_ticket_flag = true;
  setTimeout(function(){
    getTicket(fn);
  }, fetch_ticket_time);
}

function getComponentAccessToken(options, cb){
  var ttl = 7200 * 1000 - 30 * 1000;
  cb = (typeof cb === 'function') ? cb : function(){};
  getAccessTokenFromRedis(function(err, ret){
    if(err) {
      console.error(err);
      return cb(err);
    }
    if(ret && ret.ttl && ret.access_token){
      if(ret.ttl < 60){
        getAccessTokenFromWX(options, function(err, obj){
          if(err) {
            console.error(err);
            return cb(err);
          }
          if(obj.expires_in) ttl = obj.expires_in * 1000 - 30 * 1000;
          clearTimeout(accessTokenTimer);
          accessTokenTimer = setTimeout(function(){ getComponentAccessToken(options); }, ttl);
        });
      }else {
        ttl = ret.ttl * 1000 - 30 * 1000;
        wxService.component_access_token = ret.component_access_token;
        clearTimeout(accessTokenTimer);
        accessTokenTimer = setTimeout(function(){ getComponentAccessToken(options); }, ttl);
      }
    }else {
      getAccessTokenFromWX(options, function(err, obj){
        if(err) {
          console.error(err);
          return cb(err);
        }
        if(obj.expires_in) ttl = obj.expires_in * 1000 - 30 * 1000;
        clearTimeout(accessTokenTimer);
        accessTokenTimer = setTimeout(function(){ getComponentAccessToken(options); }, ttl);
      });
    }
  });
}

function getAccessTokenFromRedis(cb){
  if(!wxService.redisClient) return cb();
  wxService.redisClient.ttl("WX:ComponentAccessToken", function(err, ttl){  
    if(err) return cb(err);
    wxService.redisClient.get("WX:ComponentAccessToken", function(err, access_token){
      if(err) return cb(err);
      return cb(null, {ttl:ttl, access_token:access_token});
    });
  });
}

function getAccessTokenFromWX(options, cb){
  cb = (typeof cb === 'function') ? cb : function(){};
  var json = {};
  json.component_appid = options.app_id || wxService.app_id;
  json.component_appsecret = options.app_secret || wxService.app_secret;
  json.component_verify_ticket = options.ticket || wxService.ticket;
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
      wxService.component_access_token = body.component_access_token;
      if(wxService.redisClient) {
        var exp = body.expires_in ? Number(body.expires_in) : 7200;
        wxService.redisClient.setex("WX:ComponentAccessToken", exp, body.component_access_token);
      }
    }
    return cb(null, body);
  });
}

function parseBody(body){
  try{
    if(typeof body === 'string') body = JSON.parse(body);
  }catch(e){
    console.error(e);
  }
  return body;
}

module.exports = wxService;
