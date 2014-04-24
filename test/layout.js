'use strict';

var crosstab = require('d3-crosstab')
  , assert = require('assert')
  , has = hasOwnProperty

assert.diff = function(act,exp,d,msg){
  d = d || 0;
  msg = (msg || "") + act + " is outside " + exp + " +/- " + d.toString();
  return assert( act <= exp + d && act >= exp - d, msg);
}

function avgfn(name){
  return function(d){ 
    return d3.mean(d, function(r){ return +r[name]; }); 
  }
}

function maxfn(name){
  return function(d){
    return d3.max(d, function(r){ return +r[name]; });
  }
}

function stdfn(name){
  return function(d){ 
    var m =  d3.mean(d, function(r){ return r[name]; }); 
    var xsq = d.map( function(r){ return Math.pow(r[name] - m, 2); });
    return Math.sqrt( d3.mean(xsq) );
  }
}

/* TODO these tests eventually can be superceded by the table tests below I think */

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
  
  //////////////////////// data verifier utilities

  function tableVerifier(tab){
    var instance = {};
    var log = function(cell){ return cell; }
    
    instance.log = function(fn){
      log = fn;
      return this;
    }
    
    instance.size = function(r,c){
      assert.equal(tab.table.rows.length, r);
      assert.equal(tab.data.length, r);
      assert.equal(tab.table.cols.length, c);
      tab.data.forEach( function(col){
        assert.equal(col.length, c);
      });
      return this;
    }

    instance.row = function(n){
      var rows = [];
      var verifiers = tab.data[n].map( function(col){
        rows.push(col);
        return valueVerifier(col);
      });
      console.log('verifying row %s: %o', n, rows.map(log));
      return multiVerifier(verifiers);
    }
    instance.col = function(n){
      var cols = [];
      var verifiers = tab.data.map( function(row){ 
        cols.push(row[n]);
        return valueVerifier(row[n]); 
      });
      console.log('verifying col %s: %o', n, cols.map(log));
      return multiVerifier(verifiers);
    }

    instance.cell = function(r,c){
      return valueVerifier(tab.data[r][c]);
    }

    return instance;
  }

  function multiVerifier(verifiers){
    var instance = {};
    
    instance.length = function(n){
      assert.equal(n, verifiers.length);
      return this;
    }

    instance.colKeyPath = function(exps){
      for (var i=0;i<exps.length;++i){
        verifiers[i].colKeyPath(exps[i]);
      }
      return this;
    }

    instance.rowKeyPath = function(exps){
      for (var i=0;i<exps.length;++i){
        verifiers[i].rowKeyPath(exps[i]);
      }
      return this;
    }

    instance.avg = function(exps){
      for (var i=0;i<exps.length;++i){
        verifiers[i].avg(exps[i]);
      }
      return this;
    }
    
    instance.summary = function(exps){
      for (var i=0;i<exps.length;++i){
        verifiers[i].summary(exps[i]);
      }
      return this;
    }
    instance.sourceLength = function(exps){
      for (var i=0;i<exps.length;++i){
        verifiers[i].sourceLength(exps[i]);
      }
      return this;
    }
    instance.missing = function(idx){
      for (var i=0;i<verifiers.length;++i){
        if (~idx.indexOf(i)){
          verifiers[i].missing();
        } else {
          verifiers[i].exists();
        }
      }
      return this;
    }
    return instance;
  }

  function valueVerifier(act){
    var instance = {};

    function idmsg(str){
      return "[" + act.row.keypath.join('/') + "][" + act.col.keypath.join('/') + "]  " + str; 
    }
    
    instance.colKeyPath = function(exp){
      assert.deepEqual(act.col.keypath, exp);
      return this;
    }

    instance.rowKeyPath = function(exp){
      assert.deepEqual(act.row.keypath, exp);
      return this;
    }

    instance.avg = function(exp){
      return instance.summary( {avg: exp} );
    }
    
    instance.summary = function(exp){
      assert(has.call(act,'summary'), 
             idmsg('No summary for ' + JSON.stringify(act))
            );
      for (var k in exp){
        if (exp[k] == undefined){
          assert.equal(act.summary[k], exp[k], 
            idmsg('Expected undefined ' + k + ', was ' + JSON.stringify(act.summary[k]) )
          );
        } else {
          assert( has.call(act.summary,k), 
            idmsg('No summary key "' + k + '" for ' + JSON.stringify(act.summary) )
          );
          assert.diff(act.summary[k], exp[k], 0.001, idmsg(''));
        }
      }
      return this;
    }
    
    instance.sourceLength = function(exp){
      if (exp == undefined) return this;
      assert.equal(act.source.length, exp);
      return this;
    }

    instance.exists = function(exp){
      if (arguments.length == 0) exp = true;
      assert( (!!exp ? !(act == undefined) : (act == undefined) ), 
              idmsg(
                "Expected " + (exp ? " exists " : " missing ") + 
                ", was " + (act == undefined ? act : JSON.stringify(act))
              )
            );
      return this;
    }

    instance.missing = function(exp){
      if (arguments.length == 0) exp = true;
      return this.exists(!exp);
    }

    instance.hasCompares = function(keys){
      assert( has.call(act,'compare'), idmsg("No comparisons calculated"));
      for (var i=0;i<keys.length;++i){
        assert( has.call(act.compare,keys[i]), 
                idmsg("Missing comparison key: '"+ keys[i] + "'")
              );
      }
      return this;
    }
 
    instance.compare = function(key,exp){
      assert( has.call(act,'compare'), idmsg("No comparisons calculated"));
      assert( has.call(act.compare,key), idmsg("No comparison '" + key + "' calculated"));

      for (var k in exp){
        if (exp[k] == undefined){
          assert.equal(act.compare[key][k], exp[k], 
            idmsg("Expected undefined 'compare." + key + "." + k + "', was " + JSON.stringify(act.compare[key][k]) )
          );
        } else {
          assert( has.call(act.compare[key],k), 
            idmsg("No 'compare." + key + "." + k + "' for " + JSON.stringify(act.compare[key][k]) )
          );
          assert.diff(act.compare[key][k], exp[k], 0.001, idmsg(''));
        }
      }
      return this;
    }

    return instance;
  }

  //////////////////////// 
  
  it('0x0 table', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') ).source(true)

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table();
      console.log("0x0 table: %o", act.data);

      var verifier = tableVerifier(act);
      verifier.size(1,1);
      verifier.row(0)
              .length(1)
              .summary([ { avg: 19.78 } ])
              .sourceLength([34556])
              .colKeyPath([ [''] ]);

      verifier.col(0)
              .length(1)
              .summary([ { avg: 19.78 } ])
              .sourceLength([34556])
              .rowKeyPath([ [''] ]);

      done();
    })

  })

  it('1x1 table', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') )
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table();
      console.log("1x1 table: %o", act.data);
      
      var verifier = tableVerifier(act);
      verifier.log(function(cell){ 
        return [ cell.col.keypath.join('/'), d3.round(cell.summary.avg,3) ].join(": "); 
      });
      
      verifier.size(35,33);

      // first (summary) row
      verifier.row(0)
              .length(33)
              .avg([
19.780,  19.882,  19.808,  19.550,  19.229,  19.328,  19.126,  19.001,  18.826,  18.863,  
19.104,  19.012,  18.797,  19.585,  19.429,  19.518,  19.612,  19.526,  19.480,  19.168,  
19.001,  19.068,  19.194,  18.959,  18.979,  19.276,  19.743,  20.601,  21.104,  21.938,  
23.245,  23.489,  23.500
              ]).rowKeyPath([ 
                [""], [""], [""]
              ]).colKeyPath([
                [""], ["", "1984"], ["", "1985"]
              ]);              
              
      verifier.row(1)
              .length(33)
              .avg([
23.0805,  23.1918,  23.2232,  22.8247,  22.1176,  21.9000,  22.0256,  21.8108,  
21.5119,  21.4286,  22.0066,  21.4825,  22.0903,  23.1641,  22.8235,  22.8534,  
23.0157,  22.9154,  23.1350,  22.7814,  23.0591,  23.2684,  23.2969,  22.2246,  
22.1228,  21.8640,  22.2273,  23.6414,  24.5556,  26.4161,  26.5842,  26.9403,  
25.8750
              ]).rowKeyPath([ 
                ["", "Compact Cars"], ["", "Compact Cars"], ["", "Compact Cars"] 
              ]).colKeyPath([
                [""], ["", "1984"], ["", "1985"]
              ]);

      
      verifier.log(function(cell){ 
        return [ cell.row.keypath.join('/'), d3.round(cell.summary.avg,3) ].join(": "); 
      });
      
      verifier.col(0)
              .length(35)
              .avg([
19.780,  23.080,  18.791,  20.969,  20.776,  19.896,  21.047,  19.049,  17.523,  
20.275,  20.105,  17.934,  23.982,  21.819,  23.807,  22.000,  17.580,  16.616,  
16.764,  19.500,  17.000,  19.041,  17.297,  15.242,  16.585,  15.229,  13.000,  
18.013,  17.602,  22.664,  19.883,  15.092,  14.500,  14.442,  13.944
              ]).rowKeyPath([ 
                [""], ["", "Compact Cars"], ["", "Large Cars"]
              ]).colKeyPath([
                [""], [""], [""]
              ]);
              
      verifier.col(6)
              .length(35)
              .avg([
19.126,  22.026,  18.652,  19.571,  undefined,  19.571,  17.789,  undefined,  
undefined,  19.750,  17.000,  16.000,  undefined,  undefined,  23.932,  
undefined,  16.615,  16.000,  16.511,  undefined,  undefined,  undefined,  
undefined,  14.893,  undefined,  undefined,  undefined,  undefined,  undefined,  
23.352,  19.333,  15.265,  undefined,  undefined,  undefined
              ]).rowKeyPath([ 
                [""], ["", "Compact Cars"], ["", "Large Cars"]
              ]).colKeyPath([
                ["", "1989"], ["", "1989"], ["", "1989"]
              ]);              
              

      done();
    })
  })

  // TODO
  it('2x2 table');
  it('1x2 table');
  it('2x0 table');


   
  it('1x1 table, comparators', function(done){

    function prevrowcol(matrix,row,col){
      return matrix.fetchIndexOffset(row,col,[-1,-1]);
    }

    var tab = crosstab()
      .summary('avg', avgfn('comb08') )
      .summary('max', maxfn('comb08') )
      .cols( crosstab.dim('year').label('Year') )
      .rows( crosstab.dim('VClass').label('Vehicle Class') )
      .compareRow( 'rowpct', crosstab.compare.pct )
      .compareCol( 'colpct', crosstab.compare.pct )
      .compareTable( 'tablediff', crosstab.compare.diff )
      ;

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var act = tab().table();
      
      var verifier = tableVerifier(act);
      verifier.cell(23,4)  // random
        .summary({ avg: 15.134, max: 25 })
        .hasCompares([
          'rowpct','colpct','tablediff'
        ])
        .compare('rowpct', { avg: 99.293, max: 96.154 } )
        .compare('colpct', { avg: 78.706, max: 53.191 } )
        .compare('tablediff', { avg: -4.646 , max: -96 } )

      done();
    })
    
  })

  it('2x2 table, inter-level calc')

})

///////////////////////////////

