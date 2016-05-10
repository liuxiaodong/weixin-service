var debug = require('debug')('weixin-server');
var crypto = require('crypto');
var getRawBody = require('raw-body');
var parseString = require('xml2js').parseString;
var WXBizMsgCrypt = require('wechat-crypto');
var request = require('./request');
var util = require('./util');
var is = util.is;
var attrFormat = util.attrFormat;
var extend = util.extend;
var error = util.error;

var WxService = function(options){
  if(!(this instanceof WxService)) {
    return new WxService(options);
  }

  var defaultOptions = {
    attrNameProcessors: 'keep'
  };
  extend(defaultOptions, options);

  for(var p in defaultOptions){
    // 自定义 Token 存储函数, Token 取得函数, ticket 函数, ticket 取得函数, 默认消息处理函数
    if(['saveToken', 'getToken', 'saveTicket', 'getTicket', 'defaultNoticeHandle', 'defaultEventHandle'].indexOf(p) > -1){
      if(is(defaultOptions[p], 'function')) this[p] = defaultOptions[p];
    }else {
      this[p] = defaultOptions[p];
    }
  }
  // 解密器
  if(this.token && this.encrypt_key && this.appid && this.appsecret){
    this.crypter = new WXBizMsgCrypt(this.token, this.encrypt_key, this.appid);
  }else {
    throw error('need appid, appsecret, token and encrypt_key');
  }

  // 微信数据属性 KEY 的格式化，可以是function
  // 若使用的其他的包解析微信，则必须传入正确函数解析出
  if(!is(this.attrNameProcessors, 'function')) this.attrNameProcessors = util.defaultAttrFormatCollection[this.attrNameProcessors];
  if(!this.attrNameProcessors) this.attrNameProcessors = util.defaultAttrFormatCollection.keep;  
};

/**                                                                                                                                                                                 
 * 解析微信 POST 的xml数据的中间件                                                                                                        
 */
WxService.prototype.bodyParserMiddlewares = function(){
  var self = this;
  return function(req, res, next){
    getRawBody(req, {
      lenght: req.headers['content-length'],
      limit: '1mb',
      encodeing: 'utf8'
    }, function(err, str){
      if(err) return next(err);
      if(!str || str.length === 0)return next();
      req.rawBuf = str;
      self.xmlParser(str, function(err, ret){
        if(err) return next(err);
        req.body = attrFormat(ret.xml, self.attrNameProcessors);
        next();
      });
    });
  };
};

/**
  * 解析 POST 数据的 promise 版本
  */
WxService.prototype.bodyParserPromise = function(req){
  var deferred = Q.defer();
  getRawBody(req, {
    lenght: req.headers['content-length'],
    limit: '1mb',
    encodeing: 'utf8'
  }, function(err, str){
    if(err) return deferred.reject(err);
    if(!str || str.length === 0) deferred.reject(error('No content'));
    req.rawBuf = str;
    self.xmlParser(str, function(err, ret){
      if(err) return deferred.reject(e);
      req.body = attrFormat(ret.xml, self.attrNameProcessors);
      return deferred.resolve(req.body);
    });
  }); 
};

/**
  * xml 解析
  */
WxService.prototype.xmlParser = function(xml, cb){
  var options = {
    async: true,
    explicitArray: true,
    normalize: true,
    trim: true
  };
  parseString(xml, options, function(err, ret){
    if(err) return cb(error(err));
    cb(null, ret);
  });
};

/**
  * 解密
  */
WxService.prototype.decrypt = function(encrypt, cb){
  if(!encrypt) return cb();  
  if(!this.crypter) return cb(error('No crypter'));
  var message = this.crypter.decrypt(encrypt).message;
  var self = this;
  this.xmlParser(message, function(err, ret){
    if(err) return cb(error(err));
    var result = attrFormat(ret.xml, self.attrNameProcessors);
    cb(null, result);
  });
};

/**
  * 解密的 promise 版本
  */
WxService.prototype.decryptPromise = function(encrypt, cb){
  var deferred = Q.defer();
  if(!encrypt) return deferred.resolve();
  if(!this.crypter) return deferred.reject(error('No crypter'));
  var message = this.crypter.decrypt(encrypt).message;
  var self = this;
  this.xmlParser(message, function(err, ret){
    if(err) return deferred.reject(error(err));
    var result = attrFormat(ret.xml, self.attrNameProcessors);
    return deferred.resolve(result);
  });
};

/**
  * 验证消息的合法性
  */
var _validate = function(req, token){
  var signature = req.query.signature, timestamp = req.query.timestamp, nonce = req.query.nonce;
  var sorted = [token, timestamp, nonce].sort();
  var origin = sorted.join("");
  var encoded = crypto.createHash('sha1').update(origin).digest('hex');
  return (encoded === signature);
};

WxService.prototype.validate = function(token){
  token = token || this.token;
  return function(req, res, next){
    if(_validate(req, token)) return next();
    next(error("validate failure"));
  };
};



/**
  * 处理 url 配置是微信的验证请求
  */
WxService.prototype.enable = function(){
  return function(req, res){
    res.send(req.query.echostr);
  };
};

/**
  * 对授权时间处理的handle进行包装，处理 component_verify_ticket 的推送
  */
var handleWrapper = function(handle){
  if(!is(handle, 'function')) handle = this.defaultNoticeHandle;
  var self = this;
  return function(req, res, next){
    var info_type = req.body[self.attrNameProcessors('InfoType')];
    if(!info_type){
      debug('unknow InfoType and can not save ticket, must set correct attrNameProcessors attr to parser InfoType');
    }
    if(info_type === 'component_verify_ticket'){
      self.saveTicket(req.body[self.attrNameProcessors('ComponentVerifyTicket')]);
      res.send('success');
    }else {
      handle.call(self, req, res, next);
    }
  };
};
/**
 * 处理授权事件接收请求
 */
WxService.prototype.noticeHandle = function(handle){
  var self = this;
  handle = handleWrapper.call(this, handle);
  return function(req, res, next){
    if(!_validate(req, self.token)) return next(error("validate failure"));
    if(req.body[self.attrNameProcessors('Encrypt')]){
      self.decrypt(req.body[self.attrNameProcessors('Encrypt')], function(err, data){
        if(err) return res.status(500).end();
        req.body  = data;
        handle(req, res, next);
      });
    }else {
      handle(req, res, next);
    }
  };
};

/**
  * 授权公众号的事件推送处理
  */
WxService.prototype.eventHandle = function(handle){
  if(!is(handle, 'function')) handle = this.defaultEventHandle;
  var self = this;  
  return function(req, res, next){
    if(!_validate(req, self.token)) return next(error("validate failure"));
    if(req.body[self.attrNameProcessors('Encrypt')]){
      self.decrypt(req.body[self.attrNameProcessors('Encrypt')], function(err, data){
        if(err) return res.status(500).end();
        req.body  = data;
        req.is_encrypt = true;
        extend(res, reply(req, self));        
        handle(req, res, next);
      });
    }else {
      extend(res, reply(req, self));
      handle(req, res, next);
    }
  };
};


/**
  * 默认存数 Token 函数
  */
WxService.prototype.saveToken = function(token, callback){
  callback = is(callback, 'function') ? callback : function(){};
  this.tokenStore = {
    componentAccessToken: token.componentAccessToken,
    expireTime: (new Date().getTime()) + (token.expireTime - 10) * 1000 // 过期时间，因网络延迟等，将实际过期时间提前10秒，以防止临界点                                                
  };
  if (process.env.NODE_ENV === 'production') {
    console.warn('Dont save accessToken in memory, when cluster or multi-computer!');
  }
  if(typeof callback === 'function') callback(null, this.tokenStore);
};

/**
  * 默认获取 Token 函数
  */
WxService.prototype.getToken = function(callback){
  callback = is(callback, 'function') ? callback : function(){};
  if(this.tokenStore){
    if((new Date().getTime()) < this.tokenStore.expireTime) {
      callback(null, this.tokenStore);
    }else {
      return callback(null);
    }
  }else {
    return callback(null);
  }
};

/**
  *  默认存储 ticket 函数
  */
WxService.prototype.saveTicket = function(ticket, callback){
  callback = is(callback, 'function') ? callback : function(){};
  this.ticket = ticket;
  callback(null, ticket);
};

/**
  * 获取 ticket 的默认函数
  */
WxService.prototype.getTicket = function(callback){
  callback = is(callback, 'function') ? callback : function(){};
  callback(null, this.ticket);
};

/**
  * 授权事件推送的默认处理函数
  */
WxService.prototype.defaultNoticeHandle = function(req, res){
  res.send('success');
};

/**
  * 公众号消息事件默认处理函数
  */
WxService.prototype.defaultEventHandle = function(req, res){
  res.send('success');
};

/**
  * 公众号消息回复
  */

// 微信的 media_id 长度可能发送变化
var regex_media_id = /^[\w\_\-]{40,70}$/;
function reply(req, self) {
  var wechatidAttr = self.attrNameProcessors('ToUserName'),
      openidAttr =self. attrNameProcessors('FromUserName'),
      encryptAttr = self.attrNameProcessors('Encrypt');

  var message, data = req.body, query = req.query;
  // 组装message xml

  if (req.is_encrypt && self.crypter) {
    message = function(message) { // 需要加密
      var encrypt = self.crypter.encrypt('<xml><ToUserName><![CDATA[' + data[openidAttr] + ']]></ToUserName><FromUserName><![CDATA[' + data[wechatidAttr] + ']]></FromUserName><CreateTime>' + (~~(Date.now() / 1000)) + '</CreateTime>' + message + '</xml>');
      var signature = self.crypter.getSignature(query.timestamp, query.nonce, encrypt);
      return '<xml><Encrypt><![CDATA[' + encrypt + ']]></Encrypt><MsgSignature><![CDATA[' + signature + ']]></MsgSignature><TimeStamp>' + query.timestamp + '</TimeStamp><Nonce><![CDATA[' + query.nonce + ']]></Nonce></xml>';
    };
  } else { // 不需要加密
    message = function(message) {
      return '<xml><ToUserName><![CDATA[' + data[openidAttr] + ']]></ToUserName><FromUserName><![CDATA[' + data[wechatidAttr] + ']]></FromUserName><CreateTime>' + (~~(Date.now() / 1000)) + '</CreateTime>' + message + '</xml>';
    };
  }

  return {
    // 文本消息回复
    text: function(text) {
      return this.send(message('<MsgType><![CDATA[text]]></MsgType><Content><![CDATA[' + text + ']]></Content>'));
    },

    // 图片消息回复, image 必须为素材 id
    image: function(image) {
      if (typeof image === 'string' && image.match(regex_media_id)) {
        this.send(message('<MsgType><![CDATA[image]]></MsgType><Image><MediaId><![CDATA[' + image + ']]></MediaId></Image>'));
      } else {
        throw error('image must be a media id');
      }
    },

    // 音频回复, voice 必须为素材 id
    voice: function(voice) {
      if (voice.match(regex_media_id)) {
        this.send(message('<MsgType><![CDATA[voice]]></MsgType><Voice><MediaId><![CDATA[' + voice + ']]></MediaId></Voice>'));
      } else {
        throw error('voice must be a media id');
      }
    },

    // 视频回复 data.video 必须为微信素材id
    video: function(data) {
      if (data.video.match(regex_media_id)) {
        var video = data.video, title = data.title, description = data.description;
        this.send(message('<MsgType><![CDATA[video]]></MsgType><Video><MediaId><![CDATA[' + video + ']]></MediaId><Title><![CDATA[' + title + ']]></Title><Description><![CDATA[' + description + ']]></Description></Video>'));
      } else {
        throw error('data.video must be a media id');
      }
    },

    // 音乐回复, data.music 必须为微信素材id
    music: function(data) {
      if (data.thumb_media.match(regex_media_id)) {
        var title = data.title, description = data.description, music_url = data.music_url, hq_music_url = data.hq_music_url, thumb_media = data.thumb_media;
        this.send(message('<MsgType><![CDATA[music]]></MsgType><Music><Title><![CDATA[' + title + ']]></Title><Description><![CDATA[' + description + ']]></Description><MusicUrl><![CDATA[' + music_url + ']]></MusicUrl><HQMusicUrl><![CDATA[' + hq_music_url + ']]></HQMusicUrl><ThumbMediaId><![CDATA[' + thumb_media + ']]></ThumbMediaId></Music>'));
      } else {
        throw error('data.music must be a media id');
      }
    },

    // 图文消息
    news: function(articles) {
      articles = [].concat(articles).map(function(a) {
        var title = a.title || '', description = a.description || '', pic_url = a.pic_url || '', url = a.url || '';
        return '<item><Title><![CDATA[' + title + ']]></Title><Description><![CDATA[' + description + ']]></Description><PicUrl><![CDATA[' + pic_url + ']]></PicUrl><Url><![CDATA[' + url + ']]></Url></item>';
      });
      this.send(message('<MsgType><![CDATA[news]]></MsgType><ArticleCount>' + articles.length + '</ArticleCount><Articles>' + (articles.join('')) + '</Articles>'));
    },

    // 客服
    transfer: function() {
      this.send(message('<MsgType><![CDATA[transfer_customer_service]]></MsgType>'));
    },

    // 设备消息回复
    device: function(content) {
      content = (new Buffer(content)).toString('base64');
      this.send(message('<MsgType><![CDATA[device_text]]></MsgType><DeviceType><![CDATA[' + data[self.attrNameProcessors('DeviceType')] + ']]></DeviceType><DeviceID><![CDATA[' + data[self.attrNameProcessors('DeviceID')] + ']]></DeviceID><SessionID>' + data[self.attrNameProcessors('SessionID')] + '</SessionID><Content><![CDATA[' + content + ']]></Content>'));
    },

    // 回复空消息，表示收到请求
    ok: function() {
      this.status(200).end();
    }
  };
}

// API

/**
  * 设置 request 请求的 Options
  */

WxService.prototype.setOpts = function(opts){
  this.defaultOpts = opts;
};

/**
  * 获取设置的 request 请求配置
  */
WxService.prototype.getOpts = function(){
  return this.defaultOpts;
};

/**
  * request 中的函数扩张到 Wxservice中
  */
for(var name in request){
  WxService.prototype[name] = request[name];
}

/**
  * 从微信获取第三方服务的 accessToken
  * @param component_appid  第三方服务的 appid
  * @param component_appsecret 第三方服务的 appsecret
  * @param component_verify_ticket 第三方服的 ticket（审核通过后微信每10分钟推送一次）
  * @return 
  * {
  *   "component_access_token":"61W3mEpU66027wgNZ_MhGHNQDHnFATkDa9-2llqrMBjUwxRSNPbVsMmyD-yq8wZETSoE5NQgecigDrSHkPtIYA", 
  *   "expires_in":7200
  * }
  */
WxService.prototype.getComponentAccessToken = function(callback){
  var self = this;
  this.getTicket(function(err, ticket){
    if(err) return callback(err);
    if(!ticket) return callback(error('No ticket'));
    var json = {
      component_appid: self.appid,
      component_appsecret: self.appsecret,
      component_verify_ticket: ticket
    };
    var url = 'https://api.weixin.qq.com/cgi-bin/component/api_component_token';
    self.post(url, json, function(err, data){
      if(err) return callback(err);
      var token = {componentAccessToken: data.component_access_token, expireTime: data.expires_in};
      self.saveToken(token);
      return callback(null, token);
    });
  });
};

/**
  * 获取最新，有效的 token
  */
WxService.prototype.getLastComponentAccessToken = function(callback){
  var self = this;
  this.getToken(function(err, token){
    if(err) return callback(err);
    if(token && token.componentAccessToken && token.expireTime > 0) return callback(null, token);
    return self.getComponentAccessToken(callback);
  });
};


/**
 * 将对象合并到 WxService.prototype上
 * @param {Object} obj 要合并的对象
 */
var api = require('./api');
var _apiWrapper = function(name, fn){
  WxService.prototype[name] = function(){
    var args = Array.prototype.slice.call(arguments, 0);
    var callback = args[args.length - 1];
    if(!is(callback, 'function')) callback = function(){};
    this.getLastComponentAccessToken(function(err, token){
      if(err) return callback(err);
      this.component_access_token = token.componentAccessToken;
      fn.apply(this, args);
    }.bind(this));
  };
};
WxService.prototype.apiWrapper = _apiWrapper;

for (var name in api) {
  _apiWrapper.call(this, name, api[name]);
}


module.exports = WxService;
