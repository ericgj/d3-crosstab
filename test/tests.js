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
      assert(act[0].level == 0);
      assert(act[0].final == true);
      assert.deepEqual(act[0].path, [0]);
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
      assert(act[0].level == 0);
      assert(act[0].final == true);
      assert.deepEqual(act[0].path, [0]);
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
      assert(act[0].level == 0);
      assert(act[0].final == false);
      assert.deepEqual(act[0].path, [0]);
      
      // first
      assert(act[1].level == 1);
      assert(act[1].order == 0);
      assert(act[1].final == true);
      assert(act[1].key == "1984");
      assert.deepEqual(act[1].path, [0,0]);
      assert.deepEqual(act[1].keypath, ["","1984"]);

      // last
      assert(act[32].level == 1);
      assert(act[32].order == 31);
      assert(act[32].final == true);
      assert(act[32].key == "2015");
      assert.deepEqual(act[32].path, [0,31]);
      assert.deepEqual(act[32].keypath, ["","2015"]);

      done();
    })
  })

  // TODO this data verification sucks, improve it
  it('for 0x2, should have a grand total column followed by nested col dimension values', function(done){
    var tab = crosstab().summary( avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') )
                        .cols( crosstab.dim('VClass').label('Vehicle Class') );
    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().cols();
      console.log("0x2 cols: %o", act);
      assert(act[0].label == 'Grand');
      assert(act[0].level == 0);
      assert(act[0].final == false);
      assert.deepEqual(act[0].path, [0]);

      // first level 1
      assert(act[1].level == 1);
      assert(act[1].order == 0);
      assert(act[1].final == false);
      assert(act[1].key == "1984");
      assert.deepEqual(act[1].path, [0,0]);
      assert.deepEqual(act[1].keypath, ["","1984"]);

      // level 2 for first level 1
      for (var i=2; i<20; ++i){
        assert(act[i].level == 2);
        assert(act[i].final == true);
        assert.deepEqual(act[i].path, [0,0,i-2]);
        assert.deepEqual(act[i].keypath, ["","1984",act[i].key]);
      }

      // second level 1
      assert(act[20].level == 1);
      assert(act[20].order == 1);
      assert(act[20].final == false);
      assert(act[20].key == "1985");
      assert.deepEqual(act[20].path, [0,1]);
      assert.deepEqual(act[20].keypath, ["","1985"]);

      done();
    })
  });

  // TODO add data verification
  it('for 0x3, should have a grand total column followed by nested col dimension values', function(done){
    var isauto = function(r){ return /Automatic/i.test(r.trany); }
    var tab = crosstab().summary( avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') )
                        .cols( crosstab.dim('make').label('Make') )
                        .cols( crosstab.dim(isauto).label('Automatic?') )

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().cols();
      console.log("0x3 cols: %o", act);
      assert(act[0].label == 'Grand');
      assert(act[0].level == 0);
      assert(act[0].final == false);
      assert.deepEqual(act[0].path, [0]);
  
      done();
    })
  })

})

describe('layout matrix', function(){

  function fetchkeys(dict,keys){
    var val = dict;
    for (var i=0;i<keys.length;++i){
      val = val.get(keys[i]);
    }
    return val;
  }

  it('0x0 matrix', function(done){
    var tab = crosstab().summary( avgfn('comb08') )

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().source(true).matrix();
      console.log("0x0 matrix: %o", act);

      assert(act.length == 1);
      assert(act[0].length == 1);

      var val = fetchkeys(act[0][0], ['','']);
      assert(val);
      assert(val.source.length == 34556);
      assert.diff(val.summary, 19.78, 0.001);

      done();
    })
  })

  it('1x1 matrix', function(done){
    var tab = crosstab().summary( avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().source(true).matrix();
      console.log("1x1 matrix: %o", act);

      assert(act.length == 2);
      assert(act[0].length == 2);
      assert(act[1].length == 2);
      
      assert(fetchkeys(act[0][0], ['','']));
      assert(fetchkeys(act[0][1], ['','','1984']));
      assert(fetchkeys(act[1][0], ['','Compact Cars','']));
      assert(fetchkeys(act[1][1], ['','Midsize Cars','','1985']));

      // random value check per table
      var val = fetchkeys(act[0][0], ['','']);
      assert(val.source.length == 34556);
      assert.diff(val.summary, 19.780, 0.001);

      val = fetchkeys(act[0][1], ['','','1991'])
      assert(val.source.length == 1132);
      assert.diff(val.summary, 18.826, 0.001);

      val = fetchkeys(act[1][0], ['','Special Purpose Vehicle 2WD','']);
      assert(val.source.length == 553);
      assert.diff(val.summary, 17.580, 0.001);

      val = fetchkeys(act[1][1], ['','Subcompact Cars','','2004']);
      assert(val.source.length == 82);
      assert.diff(val.summary, 20.658, 0.001);

      done();
    })
  })
 
})
///////////////////////////////

