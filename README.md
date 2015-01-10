# weixin-service
微信公众服务相关 API 接口封装。
---

####安装
```
npm install weixin-service --save
```

####引入 weixin-service
* 引入时传入参数，参数可以根据自己需求选择
* 若在引入模块时传了某参数，在调用接口时就不再需用传入此参数
* 用户可以自己维护 ticket。在调用 weixin-service 时传入的 ticket 可以是一个 "component_verify_ticket" 字符串，也可以是一个可以获取到 "component_verify_ticket" 的函数。
* 也可以由 weixin-service 来维护 ticket，则可以不传 ticket。详见 `使用 3`
* component_access_token 参数可以是一个字符串，也可以是一个能够获取到的 component_access_token 的函数，也可以不传
* 若没有 component_access_token 参数，weixin-service 会试着根据 app_id, app_secret 和 ticket 去获取 component_access_token 凭证
* 传入redis_options 时需要依赖redis。这样 component_verify_ticket, ticket, component_access_token等凭证就会缓存到redis中，读取凭证时也优先从 redis 中读取，没取到再到微信请求获取。  

	```
		var options = {
			app_id:        		 "your app_id",          # 
			app_secret:    		 "your app_secret",      # 
			ticket:        		 ticket,                 # string or function or undefined 
			component_access_token:  component_access_token, # string or function or undefined
			token:         		 "token",                # 消息校验Token
			encrypt_key:   		 "encrypt_key",          # 消息加解密Key
			redis_options: {                    	         # redis参数
				port: 'port',
				host: 'host',
				options: {}
			}
		}
		
		var wxs = require('weixin-service')(options);
	```
	
#### 使用

1. 验证消息合法性

	```
		app.use('/url', wxs.validate(<token>));
	```
	* 在引入模块时传入了token,则此处可以不传token

2. 对 url 做 echo 校验  

	```
		app.get('/url', wxs.enable());
	```
	* 应该放在验证合法性代码模块的后面
3. 维护 ticket 并缓存

	```
		wsx.acceptNotice(req, function(err, ret){});
	```
	* 需要传入 request 对象，如果时 ticket 消息则会缓存ticket。
	* 最后返回解析后的数据 ret
	
4. 获取 component_access_token
	
	```
		options = {
			app_id: 'your app_id',              # 可选
			app_secret: 'your app_secret',      # 可选
			ticket: 'component_verify_ticket'   # 可选
		}
		wxs.getAccessToken(<options>, function(err, ret){});
	```
	* 若在引入模块时传有此参数则不再需用
	
5. 获取预授权码 pre_auth_code

	```
		options = {
			app_id: 'your app_id',                             # 可选
			component_access_token: 'component_access_token'   # 可选
		}
		wxs.preAuthCode(<options>, function(err, ret){});
	```

