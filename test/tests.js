'use strict';

var crosstab = require('d3-crosstab')
  , assert = require('assert')

assert.diff = function(act,exp,d,msg){
  d = d || 0;
  msg = msg || act.toString() + " is outside " + exp.toString() + " +/- " + d.toString();
  return assert( act <= exp + d && act >= exp - d, msg);
}

describe( 'layout', function(){

  var avgfn = function(name){
    return function(d){ 
      return d3.mean(d, function(r){ return r[name]; }); 
    }
  }

  it('for 0x0, should calculate grand total', function(done){
    var tab = crosstab().summary( avgfn('comb08') );
    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab();
      console.log("grand total: %o", act);
      assert.diff(act.summary, 19.780, 0.001);
      assert(act.collabel == 'Grand');
      assert(act.rowlabel == 'Grand');
      done();
    })
  })

  it('for 1x0, should calculate row totals and include row label', function(done){
    var tab = crosstab()
                .rows( crosstab.dim('VClass').label('Vehicle Class') )
                .summary( avgfn('comb08') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab(0);
      console.log("row totals: %o", act);
      assert(act.length == 34);

      // checking first 3 and last 2 records

      var level = act[0];
      assert(level.key == "Compact Cars");
      assert(level.values.rowlabel == "Vehicle Class");
      assert(level.values.collabel == "Grand");
      assert(level.values.original.length == 4970);
      assert.diff(level.values.summary, 23.080, 0.001);

      var level = act[1];
      assert(level.key == "Large Cars");
      assert(level.values.original.length == 1572);
      assert.diff(level.values.summary, 18.791, 0.001);

      var level = act[2];
      assert(level.key == "Midsize Cars");
      assert(level.values.original.length == 3831);
      assert.diff(level.values.summary, 20.969, 0.001);

      var level = act.slice(-1)[0];
      assert(level.key == "Vans, Passenger Type");
      assert(level.values.original.length == 285);
      assert.diff(level.values.summary, 13.944, 0.001);

      var level = act.slice(-2)[0];
      assert(level.key == "Vans, Cargo Type");
      assert(level.values.original.length == 434);
      assert.diff(level.values.summary, 14.442, 0.001);

      done();
    })
  })

  // TODO data verification here
  it('for 0x1, should calculate col totals and include col label', function(done){
    var tab = crosstab()
                .cols( crosstab.dim('year').label('Year') )
                .summary( avgfn('comb08') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab(undefined,0);
      console.log("col totals: %o", act);
      assert(act.length == 32);

      done();
    });

  })

  it('for 1x1, should normalize column values', function(done){
    var tab = crosstab()
                .rows( crosstab.dim('VClass').label('Vehicle Class') )
                .cols( crosstab.dim('year').label('Year') )
                .summary( avgfn('comb08') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);

      // expected columns
      var expcols = d3.nest()
                      .key(function(r){ return r.year; })
                      .sortKeys(d3.ascending)
                      .entries(data)
                      .map( function(r){ return r.key; } );

      tab.data(data);
      var act = tab(0,0);
      console.log("1x1 totals: %o", act);

      assert(act.length == 34);    // row count
      act.forEach( function(row){  // cols number and order should match expected
        assert.deepEqual(row.values.map(function(col){ return col.key; }), expcols);
      })

      // empty cell
      var level = act[3];
      assert( level.values[1].values.original.length == 0 );
      assert( level.values[1].values.summary == undefined );
      assert( level.values[1].values.rowlabel == 'Vehicle Class' );
      assert( level.values[1].values.collabel == 'Year' );

      done();
    })
  })

})

///////////////////////////////

