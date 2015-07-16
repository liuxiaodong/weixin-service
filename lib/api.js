var request = require('./request');
var util = require('./util');
var is = util.is;

/**
  * 获取预授权码
  * @param component_access_token 第三方服务的 accessToken
  * @param component_appid 第三方服务的 appid
  * @return
  * {
  *   "pre_auth_code":"Cx_Dk6qiBE0Dmx4EmlT3oRfArPvwSQ-oa3NL_fwHM7VI08r52wazoZX2Rhpz1dEw",
  *   "expires_in":600
  * }
  */
exports.preAuthCode = function(callback){
  var json = {
    component_appid: this.appid
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 使用授权码换取公众号的授权信息
  * @param component_access_token 第三方服务的 accessToken
  * @param component_appid 第三方服务的 appid
  * @param authorization_code 授权code,会在授权成功时返回给第三方平台，详见第三方平台授权流程说明
  * @return
  * { 
  *   "authorization_info": {
  *     "authorizer_appid": "wxf8b4f85f3a794e77", 
  *     "authorizer_access_token": "QXjUqNqfYVH0yBE1iI_7vuN_9gQbpjfK7hYwJ3P7xOa88a89-Aga5x1NMYJyB8G2yKt1KCl0nPC3W9GJzw0Zzq_dBxc8pxIGUNi_bFes0qM", 
  *     "expires_in": 7200, 
  *     "authorizer_refresh_token": "dTo-YCXPL4llX-u1W1pPpnp8Hgm4wpJtlR6iV0doKdY", 
  *     "func_info": [
  *       {
  *         "funcscope_category": {
  *           "id": 1
  *         }
  *       }, 
  *       {
  *         "funcscope_category": {
  *           "id": 2
  *         }
  *       }, 
  *     ]
  * }
  */
exports.getAuthorizationiInfo = function(authorization_code, callback){
  var json = {
    component_appid: this.appid,
    authorization_code: authorization_code
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 获取（刷新）授权公众号的令牌
  * @param component_access_token 第三方服务的 accessToken
  * @param component_appid 第三方服务的 appid
  * @param authorizer_appid 授权方appid
  * @param authorizer_refresh_token 授权方的刷新令牌
  * @return 
  * {
  *   "authorizer_access_token": "aaUl5s6kAByLwgV0BhXNuIFFUqfrR8vTATsoSHukcIGqJgrc4KmMJ-JlKoC_-NKCLBvuU1cWPv4vDcLN8Z0pn5I45mpATruU0b51hzeT1f8", 
  *   "expires_in": 7200, 
  *   "authorizer_refresh_token": "BstnRqgTJBXb9N2aJq6L5hzfJwP406tpfahQeLNxX0w"
  * }
  */
exports.refreshToken = function(authorizer_appid, authorizer_refresh_token, callback){
  var json = {
    component_appid: this.appid,
    authorizer_appid: authorizer_appid,
    authorizer_refresh_token: authorizer_refresh_token
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 获取授权方的账户信息
  * @param component_access_token 第三方服务的 accessToken
  * @param authorizer_appid 授权方appid
  * @return 
  * {
  *   "authorizer_info": {
  *     "nick_name": "微信SDK Demo Special", 
  *     "head_img": "http://wx.qlogo.cn/mmopen/GPyw0pGicibl5Eda4GmSSbTguhjg9LZjumHmVjybjiaQXnE9XrXEts6ny9Uv4Fk6hOScWRDibq1fI0WOkSaAjaecNTict3n6EjJaC/0", 
  *     "service_type_info": { "id": 2 }, 
  *     "verify_type_info": { "id": 0 },
  *     "user_name":"gh_eb5e3a772040",
  *     "alias":"paytest01"
  *   }, 
  *   "qrcode_url":"URL",    
  *   "authorization_info": {
  *     "appid": "wxf8b4f85f3a794e77", 
  *     "func_info": [
  *       { "funcscope_category": { "id": 1 } }, 
  *       { "funcscope_category": { "id": 2 } }, 
  *       { "funcscope_category": { "id": 3 } }
  *     ]
  *   }
  * }
  */
exports.getAuthorizerInfo = function(authorizer_appid, callback){
  var json = {
    component_appid: this.appid,
    authorizer_appid: authorizer_appid
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 获取授权方的选项设置信息
  * @param component_access_token 第三方服务的 accessToken
  * @param component_appid 第三方服务的 appid
  * @param authorizer_appid 授权方appid
  * @param option_name 选项名称
  * @return 
  * {
  *   "authorizer_appid":"wx7bc5ba58cabd00f4",
  *   "option_name":"voice_recognize",
  *   "option_value":"1"
  * }
  */
exports.getAuthorizerOption = function(authorizer_appid, option_name, callback){
  var json = {
    component_appid: this.appid,
    authorizer_appid: authorizer_appid,
    option_name: option_name
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_option?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 设置授权方的选项信息
  * @param component_access_token 第三方服务的 accessToken
  * @param component_appid 第三方服务的 appid
  * @param authorizer_appid 授权方appid
  * @param option_name 选项名称
  * @return 
  * {
  *   "authorizer_appid":"wx7bc5ba58cabd00f4",
  *   "option_name":"voice_recognize",
  *   "option_value":"1"
  * }
  */
exports.putAuthorizerOption = function(authorizer_appid, option_name, option_value, callback){
  var json = {
    component_appid: this.appid,
    authorizer_appid: authorizer_appid,
    option_name: option_name,
    option_value: option_value
  };
  var url = 'https://api.weixin.qq.com/cgi-bin/component/api_set_authorizer_option?component_access_token=' + this.component_access_token;
  request.post(url, json, callback);
};

/**
  * 代公众号发起网页授权
  */


/**
  * 通过 code 换取 accessToken
  */
exports.getOauthAccessToken = function(authorizer_appid, code, callback){
  var url = 'https://api.weixin.qq.com/sns/oauth2/component/access_token?appid=' + authorizer_appid + '&code=' + code + '&grant_type=authorization_code&component_appid=' + this.appid + '&component_access_token=' + this.component_access_token;
  request.get(url, callback);
};

/**
  * 刷新access_token（如果需要）
  */
exports.refreshOauthAccessToken = function(authorizer_appid, refresh_token, callback){
  var url = 'https://api.weixin.qq.com/sns/oauth2/component/refresh_token?appid=' + authorizer_appid + '&grant_type=refresh_token&component_appid=' + this.appid + '&component_access_token=' + this.component_access_token + '&refresh_token=' + refresh_token;
  request.get(url, callback);
};

/**
  * 通过网页授权access_token获取用户基本信息（需授权作用域为snsapi_userinfo）
  */
exports.getOauthInfo = function(access_token, openid, callback){
  var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN';
  request.get(url, callback);
};