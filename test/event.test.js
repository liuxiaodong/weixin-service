var should = require('should');
var config = require('./config');
var Helper = require('./helper');

var url = '/weixin/' + config.appid + '/event';
var openid = 'ovKXbsxcjA05QLUcShoQkAMfkECE';
var media_id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_-a';
var video = {video: media_id, title:'video title', description: 'video description'};
var music = {title: 'music title', description: 'music description', music_url: 'music url', hq_music_url: 'hq music url', thumb_media: media_id};
var news = [
  {
    title: 'news title',
    description: 'news description',
    pic_url: 'news pic url',
    url: 'news url'
  },
  {
    title: 'news title 1',
    description: 'news description 1',
    pic_url: 'news pic url 1',
    url: 'news url 1'
  }  
];

var helper;
beforeEach(function(){
  helper = new Helper(config, url);
});


describe('Auth Event Handle', function(){

  it('text', function(done){
    var msg = '<MsgType><![CDATA[text]]></MsgType><Content><![CDATA[this is a test]]></Content><MsgId>1234567890123456</MsgId>';
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.ToUserName.should.equal(config.id);
      req.body.FromUserName.should.equal(openid);
      req.body.Content.should.equal('this is a test');
      res.text('event handle');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('event handle');
    });
    helper.doneWapper(p1, p2, done);
  });

  it('image', function(done){
    var msg = '<MsgType><![CDATA[image]]></MsgType><PicUrl><![CDATA[http://www.pic.com/url]]></PicUrl><MediaId><![CDATA[123456]]></MediaId><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.PicUrl.should.equal('http://www.pic.com/url');
      req.body.MediaId.should.equal('123456');
      res.should.have.property('image');
      res.image(media_id);
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.image.media_id.should.equal(media_id);
    });

    helper.doneWapper(p1, p2, done);
  });

  it('voice', function(done){
    var msg = '<MsgType><![CDATA[voice]]></MsgType><MediaId><![CDATA[123456]]></MediaId><Format><![CDATA[amr]]></Format><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.MediaId.should.equal('123456');
      res.should.have.property('voice');
      res.voice(media_id);
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.voice.media_id.should.equal(media_id);
    });

    helper.doneWapper(p1, p2, done);
  });

  it('video', function(done){
    var msg = '<MsgType><![CDATA[video]]></MsgType><MediaId><![CDATA[123457]]></MediaId><ThumbMediaId><![CDATA[123]]></ThumbMediaId><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.MediaId.should.equal('123457');
      res.should.have.property('video');
      res.video(video);
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.video.media_id.should.equal(video.video);
      ret.video.title.should.equal(video.title);
      ret.video.description.should.equal(video.description);
    });

    helper.doneWapper(p1, p2, done);
  });

  it('shortvideo', function(done){
    var msg = '<MsgType><![CDATA[shortvideo]]></MsgType><MediaId><![CDATA[123456]]></MediaId><ThumbMediaId><![CDATA[123]]></ThumbMediaId><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.MediaId.should.equal('123456');
      res.should.have.property('music');
      res.music(music);
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.music.title.should.equal(music.title);
      ret.music.description.should.equal(music.description);
      ret.music.music_url.should.equal(music.music_url);
      ret.music.hqmusic_url.should.equal(music.hq_music_url);
      ret.music.thumb_media_id.should.equal(music.thumb_media);
    });

    helper.doneWapper(p1, p2, done);
  });

  it('location', function(done){
    var msg = '<MsgType><![CDATA[location]]></MsgType><Location_X>23.134521</Location_X><Location_Y>113.358803</Location_Y><Scale>20</Scale><Label><![CDATA[位置信息]]></Label><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Label.should.equal('位置信息');
      res.should.have.property('news');
      res.news(news);
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.articles.item.should.have.lengthOf(2);
    });

    helper.doneWapper(p1, p2, done);
  });

  it('link', function(done){
    var msg = '<MsgType><![CDATA[link]]></MsgType><Title><![CDATA[公众平台官网链接]]></Title><Description><![CDATA[公众平台官网链接]]></Description><Url><![CDATA[http://www.url.com]]></Url><MsgId>1234567890123456</MsgId>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Title.should.equal('公众平台官网链接');
      res.text('link');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('link');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 关注公众号
  it('subscribe', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[subscribe]]></Event>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('subscribe');
      req.body.FromUserName.should.equal(openid);
      res.text('subscribe success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('subscribe success');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 取消关注
  it('unsubscribe', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[unsubscribe]]></Event>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('unsubscribe');
      req.body.FromUserName.should.equal(openid);
      res.text('unsubscribe success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('unsubscribe success');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 用户未关注时，扫描带参数二维码事件
  it('scan and subscribe', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[subscribe]]></Event><EventKey><![CDATA[qrscene_123123]]></EventKey><Ticket><![CDATA[TICKET]]></Ticket>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('subscribe');
      req.body.FromUserName.should.equal(openid);
      req.body.EventKey.should.equal('qrscene_123123');
      res.text('scan and subscribe success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('scan and subscribe success');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 扫描带参数二维码事件
  it('scan', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[SCAN]]></Event><EventKey><![CDATA[SCENE_VALUE]]></EventKey><Ticket><![CDATA[TICKET]]></Ticket>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('SCAN');
      req.body.FromUserName.should.equal(openid);
      req.body.EventKey.should.equal('SCENE_VALUE');
      res.text('scan success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('scan success');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 上报地理位置， 经纬度
  it('reported location', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[LOCATION]]></Event><Latitude>23.137466</Latitude><Longitude>113.352425</Longitude><Precision>119.385040</Precision>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('LOCATION');
      req.body.Latitude.should.equal('23.137466');
      res.text('reported location');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('reported location');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 菜单栏点击事件
  it('menu click', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[CLICK]]></Event><EventKey><![CDATA[click_test]]></EventKey>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('CLICK');
      req.body.EventKey.should.equal('click_test');
      res.text('click');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('click');
    });

    helper.doneWapper(p1, p2, done);
  });

  // 菜单栏页面跳转
  it('menu view', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[VIEW]]></Event><EventKey><![CDATA[http://www.example.com]]></EventKey>';
    
    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.Event.should.equal('VIEW');
      req.body.EventKey.should.equal('http://www.example.com');
      res.text('view');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('view');
    });

    helper.doneWapper(p1, p2, done);
  });          


  // 卡券审核同通过
  it('card_pass_check', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[card_pass_check]]></Event><CardId><![CDATA[123456789]]></CardId>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      res.text('card_pass_check success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('card_pass_check success');
    });
    helper.doneWapper(p1, p2, done);
  });
  
  // 审核未通过
  it('card_not_pass_check', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[card_not_pass_check]]></Event><CardId><![CDATA[123456789]]></CardId>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      res.text('card_not_pass_check');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('card_not_pass_check');
    });
    helper.doneWapper(p1, p2, done);
  });

  // 用户领取卡券
  it('user_get_card', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[user_get_card]]></Event><CardId><![CDATA[123456789]]></CardId><IsGiveByFriend>1</IsGiveByFriend><UserCardCode><![CDATA[12312312]]></UserCardCode><OuterId>0</OuterId>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      req.body.UserCardCode.should.equal('12312312');
      res.text('user_get_card');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('user_get_card');
    });
    helper.doneWapper(p1, p2, done);
  });  

  // 删除卡券
  it('user_del_card', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[user_del_card]]></Event><CardId><![CDATA[123456789]]></CardId><UserCardCode><![CDATA[12312312]]></UserCardCode>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      req.body.UserCardCode.should.equal('12312312');
      res.text('user_del_card');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('user_del_card');
    });
    helper.doneWapper(p1, p2, done);
  });

  // 用户核销卡券
  it('user_consume_card', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[user_consume_card]]></Event><CardId><![CDATA[123456789]]></CardId><UserCardCode><![CDATA[12312312]]></UserCardCode><ConsumeSource><![CDATA[FROM_API]]></ConsumeSource>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      req.body.UserCardCode.should.equal('12312312');
      req.body.ConsumeSource.should.equal('FROM_API');
      res.text('user_consume_card');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('user_consume_card');
    });
    helper.doneWapper(p1, p2, done);
  });

  // 进入会员卡事件推送
  it('user_view_card', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[user_view_card]]></Event><CardId><![CDATA[123456789]]></CardId><UserCardCode><![CDATA[12312312]]></UserCardCode>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      req.body.UserCardCode.should.equal('12312312');
      res.text('user_view_card');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('user_view_card');
    });
    helper.doneWapper(p1, p2, done);
  });

  // 从卡券进入公众号会话事件推送
  it('user_enter_session_from_card', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[user_enter_session_from_card]]></Event><CardId><![CDATA[123456789]]></CardId><UserCardCode><![CDATA[12312312]]></UserCardCode>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.CardId.should.equal('123456789');
      req.body.UserCardCode.should.equal('12312312');
      res.text('user_enter_session_from_card');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('user_enter_session_from_card');
    });
    helper.doneWapper(p1, p2, done);
  });  

  // 设备消息
  it('text', function(done){
    var msg = '<MsgType><![CDATA[device_text]]></MsgType><DeviceType><![CDATA[' + config.id + ']]></DeviceType><DeviceID><![CDATA[123456]]></DeviceID><SessionID>001122334455</SessionID><Content><![CDATA[device_text_test]]></Content>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.DeviceType.should.equal(config.id);
      req.body.DeviceID.should.equal('123456');
      req.body.Content.should.equal('device_text_test');
      res.should.have.property('device');
      res.device('reply device text');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('cmVwbHkgZGV2aWNlIHRleHQ='); // ‘reply device text’ base64 编码后的内容
    });

    helper.doneWapper(p1, p2, done);
  });

  // 摇周边事件推送
  it('shake', function(done){
    var msg = '<MsgType><![CDATA[event]]></MsgType><Event><![CDATA[ShakearoundUserShake]]></Event><ChosenBeacon><Uuid><![CDATA[121212121212]]></Uuid><Major>1111</Major><Minor>1111</Minor><Distance>0.057</Distance></ChosenBeacon><AroundBeacons><AroundBeacon><Uuid><![CDATA[121212121212]]></Uuid><Major>2222</Major><Minor>2222</Minor><Distance>166.816</Distance></AroundBeacon><AroundBeacon><Uuid><![CDATA[121212121212]]></Uuid><Major>3333</Major><Minor>3333</Minor><Distance>15.013</Distance></AroundBeacon></AroundBeacons>';

    var p1 = helper.handleWrapper('post', 'eventHandle', function(req, res){
      req.body.ChosenBeacon.Uuid.should.equal('121212121212');
      req.body.ChosenBeacon.Major.should.equal('1111');
      req.body.ChosenBeacon.Minor.should.equal('1111');
      req.body.ChosenBeacon.Distance.should.equal('0.057');
      req.body.AroundBeacons.AroundBeacon.should.have.lengthOf(2);
      res.text('shakearoundusershake');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.content.should.equal('shakearoundusershake');
    });

    helper.doneWapper(p1, p2, done);
  });

});
