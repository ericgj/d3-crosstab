'use strict';

var crosstab = require('d3-crosstab')
  , assert = require('assert')
  , has = hasOwnProperty

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
    var tab = crosstab().summary('avg', avgfn('comb08') );
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
    var tab = crosstab().summary('avg', avgfn('comb08') )
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
    var tab = crosstab().summary('avg', avgfn('comb08') )
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
    var tab = crosstab().summary('avg', avgfn('comb08') )
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
    var tab = crosstab().summary('avg', avgfn('comb08') )
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


describe('layout table', function(){
  
  it('0x0 table', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') ).source(true)

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table().data;
      console.log("0x0 table: %o", act);

      assert(act.length == 1);
      assert(act[0].length == 1);
      assert(act[0][0].source.length == 34556);
      assert.diff(act[0][0].summary.avg, 19.78, 0.001);
       
      done();
    })

  })

  it('1x1 table', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') ).source(true)
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table().data;
      console.log("1x1 table: %o", act);
      
      assert(act.length == 35);
      act.forEach( function(row){
        assert(row.length == 33);
      })

      // random data checks for each quadrant
      var val = act[0][0];
      assert(val.source.length == 34556);
      assert.diff(val.summary.avg, 19.78, 0.001);

      val = act[0][6];
      assert.diff(val.summary.avg, 19.126, 0.001);

      val = act[23][0];
      assert.diff(val.summary.avg, 15.242, 0.001);

      val = act[14][19];
      assert.diff(val.summary.avg, 21.941, 0.001);

      // check for missing
      val = act[11][24];
      assert(val);
      assert(val.summary.avg == undefined);
      assert(val.source.length == 0);

      done();
    })
  })

  // TODO
  it('2x2 table');
  it('1x2 table');
  it('2x0 table');

})

describe('layout table with comparisons', function(){

  it('1x1 table, single calc per comparator', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') )
                        .compareRow( 'rowpct', crosstab.compare.pct )
                        .compareCol( 'colpct', crosstab.compare.pct )
                        .compareTable( 'diff', crosstab.compare.diff )
                        .comparePrevCol( 'pctchange', crosstab.compare.pct )
                        .comparePrevCol( 'last', function(val,comp,k){ return comp; })

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table().data;
      
      console.log('1x1 table: at (2,2): %o', act[2][2]);
      console.log('1x1 table: last at (2,0): %o', 
        act[2].map( function(cell){ return cell.compare.last; })
      );

      done();
    })
    
  })

  it('1x1 table, multiple calc per comparator')

  it('2x2 table, inter-level calc')
  
  it('0x1 table, inter-level calc')
  
  it('1x0 table, intra-level calc')

  it('0x0 table')

})

///////////////////////////////
