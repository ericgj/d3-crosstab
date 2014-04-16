'use strict';

var crosstab = require('d3-crosstab')
  , assert = require('assert')

assert.diff = function(act,exp,d,msg){
  d = d || 0;
  msg = msg || act.toString() + " is outside " + exp.toString() + " +/- " + d.toString();
  return assert( act <= exp + d && act >= exp - d, msg);
}

function avgfn(name){
  return function(d){ 
    return d3.mean(d, function(r){ return r[name]; }); 
  }
}


describe( 'layout cols', function(){

  it('for 0x0, should have grand total column', function(done){
    var tab = crosstab().summary( avgfn('comb08') );
    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().cols();
      console.log("0x0 cols: %o", act);
      assert(act.length == 1);
      assert(act[0].label == 'Grand');
      assert(act[0].level == -1);
      assert(act[0].final == true);
      done();
    })
  })

  it('for 0x0 filtered, should have grand total column', function(done){
    var tab = crosstab().summary( avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') );
    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab(0,0).cols();
      console.log("0x0 filtered cols: %o", act);
      assert(act.length == 1);
      assert(act[0].label == 'Grand');
      assert(act[0].level == -1);
      assert(act[0].final == true);
      done();
    })
  })

  it('for 0x1, should have a grand total column followed by first col dimension values', function(done){
    var tab = crosstab().summary( avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') );
    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().cols();
      console.log("0x1 cols: %o", act);
      assert(act.length == 33);
      assert(act[0].label == 'Grand');
      assert(act[0].level == -1);
      assert(act[0].final == false);
      
      // first
      assert(act[1].level == 0);
      assert(act[1].order == 0);
      assert(act[1].final == true);
      assert(act[1].key == "1984");

      // last
      assert(act[32].level == 0);
      assert(act[32].order == 31);
      assert(act[32].final == true);
      assert(act[32].key == "2015");

      done();
    })
  })

})

///////////////////////////////

