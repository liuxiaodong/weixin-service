/**
  * 调用微信 API 需要正确的 access_token
  * 这里测试重写 api 方法，保证在调用微信 API 接口时 url 和 所传参数正确
  */

var should = require('should');
var config = require('./config');

var componentAccessToken = 'componentAccessToken-test';

var weixin = require('../')({
  id: config.id,
  appid: config.appid,
  appsecret: config.appsecret,
  token: config.token,
  encrypt_key: config.encrypt_key,
  getToken: function(callback){
    callback(null, {componentAccessToken: componentAccessToken, expireTime: 7200});
  }
});

weixin.setOpts({timeout: 20000});

describe('API', function(){

  it('setOpts', function(done){
    var opts = weixin.getOpts();
    opts.timeout.should.equal(20000);
    done();
  });

  it('getLastComponentAccessToken', function(done){
    weixin.getLastComponentAccessToken(function(err, token){
      token.componentAccessToken.should.equal(componentAccessToken);
      token.expireTime.should.equal(7200);
      done();
    });
  });

  it('getComponentAccessToken  without ticket', function(done){
    weixin.getComponentAccessToken(function(err, token){
      err.name.should.equal('WeixinServerError');
      done();
    });    
  });

  it('getComponentAccessToken with invalid ticket', function(done){
    weixin.ticket = 'ticket-test';
    weixin.getComponentAccessToken(function(err, token){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom getComponentAccessToken', function(done){
    weixin.getComponentAccessToken = function(callback) {
      var self = this;
      this.getTicket(function(err, ticket) {
        if (err) return callback(err);
        if (!ticket) return callback(error('No ticket'));
        var json = {
          component_appid: self.appid,
          component_appsecret: self.appsecret,
          component_verify_ticket: ticket
        };
        return callback(null, json);
      });
    };

    weixin.getComponentAccessToken(function(err, token){
      token.component_appid.should.equal(config.appid);
      token.component_appsecret.should.equal(config.appsecret);
      token.component_verify_ticket.should.equal('ticket-test');
      done();
    });

  });

  it('preAuthCode with invalid component_access_token', function(done){
    weixin.preAuthCode(function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom preAuthCode', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=';
    weixin.preAuthCode = function(callback){
      var json = {
        component_appid: this.appid
      };
      var url = pre_url + this.component_access_token;
      this.post(url, json, function(){
        callback(null, {json:json, url:url});
      });
    };

    weixin.preAuthCode(function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.url.should.equal(pre_url + componentAccessToken);
      done();
    });
  });

  it('getAuthorizationiInfo with invalid component_access_token', function(done){
    var authorization_code = '123456';
    weixin.getAuthorizationiInfo(authorization_code, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom getAuthorizationiInfo', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=';
    weixin.getAuthorizationiInfo = function(authorization_code, callback){
      var json = {
        component_appid: this.appid,
        authorization_code: authorization_code
      };
      var url = pre_url + this.component_access_token;
      callback(null, {url:url, json: json});
    };    

    var authorization_code = '123456';
    weixin.getAuthorizationiInfo(authorization_code, function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.json.authorization_code.should.equal(authorization_code);
      data.url.should.equal(pre_url + componentAccessToken);
      done();
    });
  });  

  it('refreshToken with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var authorizer_refresh_token = 'refresh-token-123456';
    weixin.refreshToken(authorizer_appid, authorizer_refresh_token, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });


  it('custom refreshToken', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=';
    weixin.refreshToken = function(authorizer_appid, authorizer_refresh_token, callback){
      var json = {
        component_appid: this.appid,
        authorizer_appid: authorizer_appid,
        authorizer_refresh_token: authorizer_refresh_token
      };
      var url = pre_url + this.component_access_token;
      callback(null, {json:json, url:url});
    };

    var authorizer_appid = 'wx123456';
    var authorizer_refresh_token = 'refresh-token-123456';
    weixin.refreshToken(authorizer_appid, authorizer_refresh_token, function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.json.authorizer_appid.should.equal(authorizer_appid);
      data.json.authorizer_refresh_token.should.equal(authorizer_refresh_token);
      data.url.should.equal(pre_url + componentAccessToken);
      done();
    });
  });

  it('getAuthorizerInfo with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    weixin.getAuthorizerInfo(authorizer_appid, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom getAuthorizerInfo', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_info?component_access_token=';
    weixin.getAuthorizerInfo = function(authorizer_appid, callback){
      var json = {
        component_appid: this.appid,
        authorizer_appid: authorizer_appid
      };
      var url = pre_url + this.component_access_token;
      callback(null, {json: json, url:url});
    };    

    var authorizer_appid = 'wx123456';
    weixin.getAuthorizerInfo(authorizer_appid, function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.json.authorizer_appid.should.equal(authorizer_appid);
      done();
    });
  });

  it('getAuthorizerOption with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var option_name = 'voice_recognize';
    weixin.getAuthorizerOption(authorizer_appid, option_name, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom getAuthorizerOption', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_get_authorizer_option?component_access_token=';
    weixin.getAuthorizerOption = function(authorizer_appid, option_name, callback){
      var json = {
        component_appid: this.appid,
        authorizer_appid: authorizer_appid,
        option_name: option_name
      };
      var url = pre_url + this.component_access_token;
      callback(null, {json: json, url:url});
    };

    var authorizer_appid = 'wx123456';
    var option_name = 'voice_recognize';
    weixin.getAuthorizerOption(authorizer_appid, option_name, function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.json.authorizer_appid.should.equal(authorizer_appid);
      data.json.option_name.should.equal(option_name);
      data.url.should.equal(pre_url + componentAccessToken);
      done();
    });
  });

  it('putAuthorizerOption with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var option_name = 'voice_recognize';
    var option_value = 'option_value_value';
    weixin.putAuthorizerOption(authorizer_appid, option_name, option_value, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  }); 

  it('costom putAuthorizerOption', function(done){
    var pre_url = 'https://api.weixin.qq.com/cgi-bin/component/api_set_authorizer_option?component_access_token=';
    weixin.putAuthorizerOption = function(authorizer_appid, option_name, option_value, callback){
      var json = {
        component_appid: this.appid,
        authorizer_appid: authorizer_appid,
        option_name: option_name,
        option_value: option_value
      };
      var url = pre_url + this.component_access_token;
      callback(null, {json: json, url:url});
    };

    var authorizer_appid = 'wx123456';
    var option_name = 'voice_recognize';
    var option_value = 'option_value_value';
    weixin.putAuthorizerOption(authorizer_appid, option_name, option_value, function(err, data){
      data.json.component_appid.should.equal(config.appid);
      data.json.authorizer_appid.should.equal(authorizer_appid);
      data.json.option_name.should.equal(option_name);
      data.json.option_value.should.equal(option_value);
      data.url.should.equal(pre_url + componentAccessToken);
      done();
    });
  }); 

  it('getOauthAccessToken with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var code = 'code987654';
    weixin.getOauthAccessToken(authorizer_appid, code, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom getOauthAccessToken', function(done){
    weixin.getOauthAccessToken = function(authorizer_appid, code, callback){
      var url = 'https://api.weixin.qq.com/sns/oauth2/component/access_token?appid=' + authorizer_appid + '&code=' + code + '&grant_type=authorization_code&component_appid=' + this.appid + '&component_access_token=' + this.component_access_token;
      callback(null, {url:url});
    };

    var authorizer_appid = 'wx123456';
    var code = 'code987654';
    weixin.getOauthAccessToken(authorizer_appid, code, function(err, data){
      data.url.should.equal('https://api.weixin.qq.com/sns/oauth2/component/access_token?appid=' + authorizer_appid + '&code=' + code + '&grant_type=authorization_code&component_appid=' + config.appid + '&component_access_token=' + componentAccessToken);
      done();
    });
  });

  it('refreshOauthAccessToken with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var refresh_token = 'refresh_token123456';
    weixin.refreshOauthAccessToken(authorizer_appid, refresh_token, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('custom refreshOauthAccessToken', function(done){
    weixin.refreshOauthAccessToken = function(authorizer_appid, refresh_token, callback){
      var url = 'https://api.weixin.qq.com/sns/oauth2/component/refresh_token?appid=' + authorizer_appid + '&grant_type=refresh_token&component_appid=' + this.appid + '&component_access_token=' + this.component_access_token + '&refresh_token=' + refresh_token;
      callback(null, {url: url});
    };

    var authorizer_appid = 'wx123456';
    var refresh_token = 'refresh_token123456';
    weixin.refreshOauthAccessToken(authorizer_appid, refresh_token, function(err, data){
      data.url.should.equal('https://api.weixin.qq.com/sns/oauth2/component/refresh_token?appid=' + authorizer_appid + '&grant_type=refresh_token&component_appid=' + config.appid + '&component_access_token=' + componentAccessToken + '&refresh_token=' + refresh_token);
      done();
    });
  });

  it('getOauthInfo with invalid component_access_token', function(done){
    var authorizer_appid = 'wx123456';
    var openid = 'openid123456';
    weixin.getOauthInfo(authorizer_appid, openid, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });  

  it('getOauthInfo with invalid component_access_token', function(done){
    var access_token = 'access_token9876543210';
    var openid = 'openid123456';
    weixin.getOauthInfo(access_token, openid, function(err, data){
      err.name.should.equal('WeixinServerError');
      done();
    });
  });

  it('getOauthInfo with invalid component_access_token', function(done){
    weixin.getOauthInfo = function(access_token, openid, callback){
      var url = 'https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN';
      callback(null, {url:url});
    };

    var access_token = 'access_token9876543210';
    var openid = 'openid123456';
    weixin.getOauthInfo(access_token, openid, function(err, data){
      data.url.should.equal('https://api.weixin.qq.com/sns/userinfo?access_token=' + access_token + '&openid=' + openid + '&lang=zh_CN');
      done();
    });
  });  

});
