# weixin-service
微信公众服务相关 API 接口封装。
---
[![Build Status](https://travis-ci.org/liuxiaodong/weixin-service.png)](https://travis-ci.org/liuxiaodong/weixin-service)
[![Coverage Status](https://coveralls.io/repos/liuxiaodong/weixin-service/badge.png)](https://coveralls.io/github/liuxiaodong/weixin-service)  

*** weixin-service 和 0.0.* 版本完全不兼容

####微信文档

<a href="https://open.weixin.qq.com/cgi-bin/frame?t=resource/res_main_tmpl&verify=1&lang=zh_CN" target='_blank'>第三方服务开发文档</a>


####安装
```
npm install weixin-service --save
```

####使用

```js
var options = {
	appid:        		 "your app_id",       
	appsecret:    		 "your app_secret",      
	token:         		 "token",                
	encrypt_key:   		 "encrypt_key",          
}

var wxs = require('weixin-service')(options);

var app = require('express')()

app.get('/wechat/notice', wxs.enable());
app.post('/wechat/notice', wxs.noticeHandle(noticeHandle));

app.get('/wechat/:appid/event', wxs.enable());
app.post('/wechat/:appid/event', wxs.eventHandle(eventHandle))

```
	

#### options 说明

`appid:` 第三方服务号 appid

`appsecret:`  第三方服务 appsecret

`token:`  第三方服务 token

`encrypt_key:` 第三方服务加密 key

`attrNameProcessors`: 数据属性的格式化处理，比如：{AppId: '1234'} -> {app_id: '1234'}  

```
keep: 保持不变 (AppId)  
lowerCase: 小写 (appid)   
underscored: 小写并以下划线分开 (app_id)  
也可以自定义函数 function(attr){ return attr; }  
```

`saveToken:` 保存第三方服务的 component_access_token 函数，默认保存到内存中  

```
saveToken = function(token, callback){}  
token: {  
	componentAccessToken: '',  
	expireTime: 7200  
}  
```

`getToken:` 获取 component_access_token 函数
	
```
saveToken = function(callback){ callback(null, token); }

```

`saveTicket:` 保存微信推送的 component_verify_ticket 函数

```
saveTicket = function(ticket){}
```

`getTicket:` 获取 component_verify_ticket 函数

```
getTicket: function(callback){ callback(ticket); }
```

#### API

* 配置 request 请求的 options，参照 <a href="https://github.com/node-modules/urllib">urllib</a>

* 获取可用的 component_access_token
	
```
	wxs.getLastComponentAccessToken(function(err, token){});
```
	
* 获取预授权码 pre_auth_code

```
	wxs.preAuthCode(function(err, ret){});
```

* 使用授权码换取公众号的授权信息

```
	wxs.getAuthorizationiInfo(authorization_code, function(err, ret){});
```

* 通过刷新令牌刷新(获取)授权公众号的令牌

```
	wxs.refreshToken(authorizer_appid, authorizer_refresh_token, function(err, ret){});
```

* 获取授权方账户信息

```
	wxs.getAuthorizerInfo(authorizer_appid, function(err, ret){});
```
* 获取授权方的选项设置信息

```
	wxs.getAuthorizerOption(authorizer_appid, option_name, function(err, ret){});
```
* 设置授权方的选项设置信息

```
	wxs.getAuthorizerOption(authorizer_appid, option_name, option_value, function(err, ret){});
```

* 待公众号发起网页授权时通过 code 换取 accessToken 等信息

```
	wxs.getOauthAccessToken(authorizer_appid, code, function(err, ret){});
```

* 待公众号发起网页授权 刷新 accessToken（如果需要）

```
	wxs.refreshOauthAccessToken(authorizer_appid, refresh_token, function(err, ret){});
```

* 通过网页授权access_token获取用户基本信息（需授权作用域为snsapi_userinfo）
	
```
	wxs.getOauthInfo(access_token, openid, function(err, ret){});
```


#### 消息回复

`res:`  response  

`media_id:` 素材 id

* 文本消息
	
```
	res.text('text');
```

* 图片

```
	res.image(media_id);
```

* 录音

```
	res.voice(media_id);
```

* 视频
	
```
	res.video({video: media_id, title:'title', description: 'description'});
```

* 音乐

```
	res.music({thumb_media: media_id, title: 'title', description: 'description', music_url: 'music_url', hq_music_url: 'hq_music_url'})
```

* 图文消息

```
	var news = [
		{
			title: 'title',
			description: 'description',
			pic_url: 'pic_url',
			url : 'url'
		}
	];

	res.news(news);
```

* 客服

```
	res.transfer();
```

* IOT 设备消息

```
	res.device('command');
```

* 回复空字符串

```
	res.ok();
```
