var should = require('should');
var config = require('./config');
var Helper = require('./helper');

var url = '/weixin/notice';
var helper;
beforeEach(function(){
  helper = new Helper(config, url);
});

describe('Signature', function(){

  it('verify', function(done){
    var p1 = helper.handleWrapper('get', 'enable');

    var p2 = helper.requestWrapper('get', url, config.token, 'echostr', function(err, ret){
      should.not.exist(err);
      ret.should.equal('echostr');
    });
    helper.doneWapper(p1, p2, done);
  });

});
