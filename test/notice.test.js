var should = require('should');
var config = require('./config');
var Helper = require('./helper');

var url = '/weixin/notice';
var ticket;
var helper;
beforeEach(function(){
  config.saveTicket = function(str){
    ticket = str;
  };
  helper = new Helper(config, url);
});

describe('Auth Notice', function(){

  it('component_verify_ticket', function(done){
    var msg = '<InfoType>component_verify_ticket</InfoType><ComponentVerifyTicket>123456789987654321</ComponentVerifyTicket>';
    var p1 = helper.handleWrapper('post', 'noticeHandle', function(req, res){
      res.send('notice handle');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, true, function(err, ret){
      should.not.exist(err);
      ticket.should.equal('123456789987654321');
    });
    helper.doneWapper(p1, p2, done);
  });

  it('unauthorized', function(done){
    var msg = '<InfoType>unauthorized</InfoType><AuthorizerAppid>wx234829348</AuthorizerAppid>';
    var p1 = helper.handleWrapper('post', 'noticeHandle', function(req, res){
      req.body.AppId.should.equal(config.appid);
      req.body.InfoType.should.equal('unauthorized');
      req.body.AuthorizerAppid.should.equal('wx234829348');
      res.send('unauthorized success');
    });

    var p2 = helper.requestWrapper('post', url, config, msg, true, function(err, ret){
      should.not.exist(err);
      ret.should.equal('unauthorized success');
    });
    helper.doneWapper(p1, p2, done);
  }); 

});
