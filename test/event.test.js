var should = require('should');
var config = require('./config');
var Helper = require('./helper');

var url = '/weixin/' + config.appid + '/event';
var openid = 'o5MEJuLi09wynBkh1gDvgP_jSN2g';
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
      res.send('event handle');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, openid, true, function(err, ret){
      should.not.exist(err);
      ret.should.equal('event handle');
    });
    helper.doneWapper(p1, p2, done);
  });

});
