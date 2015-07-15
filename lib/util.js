/**
  * 工具集函数
  */

'use strict';

var _toString = Object.prototype.toString;

/**
  * 类型判断
  * object array string function null number boolean undefined
  */
var _is = function(data, type){
  var _type = _toString.call(data).replace('[object ','').replace(']','').toLowerCase();
  type = (type || '').toLowerCase();
  return _type === type;
};
exports.is = _is;

/**                                                                                                                                                
  * 字符串格式化                                                                                                                                   
  * keep: 保持不变                                                                                                                                 
  * lowerCase: 转为消息                                                                                                                            
  * underscored: 转为下划线形式                                                                                                                    
  */
exports.defaultAttrFormatCollection = {
  keep: function(str){
    return str.trim();
  },
  lowerCase: function(str){
    return str.trim().toLowerCase();
  },
  underscored: function(str){
    return str.trim().replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
  }
};

/**
  * 属性格式化
  * 对 Object 的 key 的格式化
  */
exports.attrFormat = function(data, attrNameProcessors){
  var _format = function(data){
    for(var p in data){
      var value = data[p];
      var prot = p;
      if(_is(prot, 'string')) prot = attrNameProcessors(prot);
      if(prot !== p){
        data[prot] = value;
        delete data[p];
      }
      if(_is(value, 'array') || _is(value, 'object')) {
        if(_is(value, 'array') && value.length === 1){
          data[prot] = value[0];
        }
        _format(data[prot]);
      }
    }
  };
  if(!_is(data, 'object') && !_is(data, 'array')) return data;
  _format(data);
  return data;
};

/**
  * 扩展
  */
exports.extend = function(src, target){
  for(var p in target){
    src[p] = target[p];
  }
  return src;
};

/**
  * 错误包装
  */
exports.error = function(err){
  if(_is(err, 'error')) {
    err.name = 'WeixinServer' + err.name;
  }else {
    err = new Error(err);
    err.name = 'WeixinServerError';  
  }
  return err;
};

/**
  * 对微信放回错误的包装
  */
exports.wrapper = function(callback){
  if(!_is(callback, 'function')) callback = function(){};
  return function(err, data, res) {
    if (err) {
      err.name = 'WeixinServer' + err.name;
      return callback(err, data, res);
    }
    if(!data) {
      return callback(exports.error('Not get'));
    }
    if (data && data.errcode) {
      err = new Error(data.errmsg);
      err.name = 'WeixinServerError';
      err.code = data.errcode;
      return callback(err, data, res);
    }
    callback(null, data, res);
  };
};


