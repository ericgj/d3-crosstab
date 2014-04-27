'use strict';

var matrix = require('d3-crosstab/matrix')
  , assert = require('assert')
  , has = hasOwnProperty

assert.diff = function(act,exp,d,msg){
  d = d || 0;
  msg = msg || act.toString() + " is outside " + exp.toString() + " +/- " + d.toString();
  return assert( act <= exp + d && act >= exp - d, msg);
}

describe('matrix tests', function(){ 

  describe('matrix', function(){

    it('1x1', function(done){
      var rowvars = buildvars([[fetchfn('make'), insensitive]]);
      var colvars = buildvars([[fetchfn('year'), d3.ascending]]);
     
      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
       
        var verifier = matrixVerifier(act);
        verifier.dimensions(1,1);
        verifier.rows(0)
                .keypath([
  ["Acura"],  ["Alfa Romeo"],  ["AM General"],  ["American Motors Corporation"],
  ["ASC Incorporated"],  ["Aston Martin"],  ["Audi"],  ["Aurora Cars Ltd"],
  ["Autokraft Limited"],  ["Avanti Motor Corporation"],  ["Azure Dynamics"],
  ["Bentley"],  ["Bertone"],  ["Bill Dovell Motor Car Company"],  
  ["Bitter Gmbh and Co. Kg"],  ["BMW"],  ["BMW Alpina"],  ["Bugatti"],  ["Buick"],
  ["BYD"],  ["Cadillac"],  ["CCC Engineering"],  ["Chevrolet"],  ["Chrysler"],
  ["CODA Automotive"],  ["Consulier Industries Inc"],  ["CX Automotive"],
  ["Dabryan Coach Builders Inc"],  ["Dacia"],  ["Daewoo"],  ["Daihatsu"],
  ["Dodge"],  ["E. P. Dutton, Inc."],  ["Eagle"],  
  ["Environmental Rsch and Devp Corp"],  ["Evans Automobiles"],  ["Excalibur Autos"],  
  ["Federal Coach"],  ["Ferrari"],  ["Fiat"],  ["Fisker"],  ["Ford"],  
  ["General Motors"],  ["Geo"],  ["GMC"],  ["Goldacre"],  
  ["Grumman Allied Industries"],  ["Grumman Olson"], ["Honda"],  ["Hummer"],  
  ["Hyundai"],  ["Import Foreign Auto Sales Inc"],
  ["Import Trade Services"],  ["Infiniti"],  ["Isis Imports Ltd"],  ["Isuzu"],
  ["J.K. Motors"],  ["Jaguar"],  ["JBA Motorcars, Inc."],  ["Jeep"],  
  ["Kenyon Corporation Of America"],  ["Kia"],  ["Laforza Automobile Inc"],  
  ["Lambda Control Systems"],  ["Lamborghini"],  ["Land Rover"],  ["Lexus"],  
  ["Lincoln"],  ["London Coach Co Inc"],  ["London Taxi"],  ["Lotus"],  
  ["Mahindra"],  ["Maserati"],  ["Maybach"],  ["Mazda"],  ["Mcevoy Motors"],  
  ["McLaren Automotive"],  ["Mercedes-Benz"],  ["Mercury"],  ["Merkur"],  ["MINI"],
  ["Mitsubishi"],  ["Morgan"],  ["Nissan"],  ["Oldsmobile"],  ["Panos"],
  ["Panoz Auto-Development"],  ["Panther Car Company Limited"],  
  ["PAS Inc - GMC"],  ["PAS, Inc"],  ["Peugeot"],  ["Pininfarina"],  ["Plymouth"],
  ["Pontiac"],  ["Porsche"],  ["Quantum Technologies"],  ["Qvale"],  ["Ram"],
  ["Red Shift Ltd."],  ["Renault"],  ["Rolls-Royce"],  ["Roush Performance"],
  ["Ruf Automobile Gmbh"],  ["S and S Coach Company  E.p. Dutton"],  ["Saab"],
  ["Saleen"],  ["Saleen Performance"],  ["Saturn"],  ["Scion"],  ["Shelby"],
  ["smart"],  ["Spyker"],  ["SRT"],  ["Sterling"],  ["Subaru"],  
  ["Superior Coaches Div E.p. Dutton"],  ["Suzuki"],  ["Tecstar, LP"],  ["Tesla"],
  ["Texas Coach Company"],  ["Toyota"],  ["TVR Engineering Ltd"],  ["Vector"],
  ["Vixen Motor Company"],  ["Volga Associated Automobile"],  ["Volkswagen"],
  ["Volvo"],  ["VPG"],  ["Wallace Environmental"],  ["Yugo"] ["Acura"]
                ]);

        verifier.cols(0)
                .keypath([
  ["1984"],  ["1985"],  ["1986"],  ["1987"],  ["1988"],  ["1989"],  ["1990"],
  ["1991"],  ["1992"],  ["1993"],  ["1994"],  ["1995"],  ["1996"],  ["1997"],
  ["1998"],  ["1999"],  ["2000"],  ["2001"],  ["2002"],  ["2003"],  ["2004"],
  ["2005"],  ["2006"],  ["2007"],  ["2008"],  ["2009"],  ["2010"],  ["2011"],
  ["2012"],  ["2013"],  ["2014"],  ["2015"]
                ])

         
        done();
      })

    })

    it('2x1', function(done){
      var rowvars = buildvars([
        [fetchfn('make'), insensitive],
        [fetchfn('VClass'), insensitive]
      ]);
      var colvars = buildvars([
        [fetchfn('year'), d3.ascending]
      ]);

      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
       
        var verifier = matrixVerifier(act);
        verifier.dimensions(2,1);
        verifier.rows(0)
                .keypath([
                   ["Acura"], ["Alfa Romeo"]
                ]);

        verifier.rows(1)
                .keypath([
                   ["Acura", "Compact Cars"], ["Acura", "Midsize Cars"]
                ]);

        verifier.cols(0)
                .keypath([
  ["1984"],  ["1985"],  ["1986"],  ["1987"],  ["1988"],  ["1989"],  ["1990"],
  ["1991"],  ["1992"],  ["1993"],  ["1994"],  ["1995"],  ["1996"],  ["1997"],
  ["1998"],  ["1999"],  ["2000"],  ["2001"],  ["2002"],  ["2003"],  ["2004"],
  ["2005"],  ["2006"],  ["2007"],  ["2008"],  ["2009"],  ["2010"],  ["2011"],
  ["2012"],  ["2013"],  ["2014"],  ["2015"]
                ]);
   
        done();
      })  

    })

    it('1x2', function(done){
      var rowvars = buildvars([
        [fetchfn('make'), insensitive],
      ]);
      var colvars = buildvars([
        [function(r){ return r['year'].slice(0,3) + '0s'; }, d3.ascending],
        [fetchfn('year'), d3.ascending]
      ]);

      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
       
        var verifier = matrixVerifier(act);
        verifier.dimensions(1,2);
        verifier.rows(0)
                .keypath([
  ["Acura"],  ["Alfa Romeo"],  ["AM General"],  ["American Motors Corporation"],
  ["ASC Incorporated"],  ["Aston Martin"],  ["Audi"],  ["Aurora Cars Ltd"],
  ["Autokraft Limited"],  ["Avanti Motor Corporation"],  ["Azure Dynamics"],
  ["Bentley"],  ["Bertone"],  ["Bill Dovell Motor Car Company"],  
  ["Bitter Gmbh and Co. Kg"],  ["BMW"],  ["BMW Alpina"],  ["Bugatti"],  ["Buick"],
  ["BYD"],  ["Cadillac"],  ["CCC Engineering"],  ["Chevrolet"],  ["Chrysler"],
  ["CODA Automotive"],  ["Consulier Industries Inc"],  ["CX Automotive"],
  ["Dabryan Coach Builders Inc"],  ["Dacia"],  ["Daewoo"],  ["Daihatsu"],
  ["Dodge"],  ["E. P. Dutton, Inc."],  ["Eagle"],  
  ["Environmental Rsch and Devp Corp"],  ["Evans Automobiles"],  ["Excalibur Autos"],  
  ["Federal Coach"],  ["Ferrari"],  ["Fiat"],  ["Fisker"],  ["Ford"],  
  ["General Motors"],  ["Geo"],  ["GMC"],  ["Goldacre"],  
  ["Grumman Allied Industries"],  ["Grumman Olson"], ["Honda"],  ["Hummer"],  
  ["Hyundai"],  ["Import Foreign Auto Sales Inc"],
  ["Import Trade Services"],  ["Infiniti"],  ["Isis Imports Ltd"],  ["Isuzu"],
  ["J.K. Motors"],  ["Jaguar"],  ["JBA Motorcars, Inc."],  ["Jeep"],  
  ["Kenyon Corporation Of America"],  ["Kia"],  ["Laforza Automobile Inc"],  
  ["Lambda Control Systems"],  ["Lamborghini"],  ["Land Rover"],  ["Lexus"],  
  ["Lincoln"],  ["London Coach Co Inc"],  ["London Taxi"],  ["Lotus"],  
  ["Mahindra"],  ["Maserati"],  ["Maybach"],  ["Mazda"],  ["Mcevoy Motors"],  
  ["McLaren Automotive"],  ["Mercedes-Benz"],  ["Mercury"],  ["Merkur"],  ["MINI"],
  ["Mitsubishi"],  ["Morgan"],  ["Nissan"],  ["Oldsmobile"],  ["Panos"],
  ["Panoz Auto-Development"],  ["Panther Car Company Limited"],  
  ["PAS Inc - GMC"],  ["PAS, Inc"],  ["Peugeot"],  ["Pininfarina"],  ["Plymouth"],
  ["Pontiac"],  ["Porsche"],  ["Quantum Technologies"],  ["Qvale"],  ["Ram"],
  ["Red Shift Ltd."],  ["Renault"],  ["Rolls-Royce"],  ["Roush Performance"],
  ["Ruf Automobile Gmbh"],  ["S and S Coach Company  E.p. Dutton"],  ["Saab"],
  ["Saleen"],  ["Saleen Performance"],  ["Saturn"],  ["Scion"],  ["Shelby"],
  ["smart"],  ["Spyker"],  ["SRT"],  ["Sterling"],  ["Subaru"],  
  ["Superior Coaches Div E.p. Dutton"],  ["Suzuki"],  ["Tecstar, LP"],  ["Tesla"],
  ["Texas Coach Company"],  ["Toyota"],  ["TVR Engineering Ltd"],  ["Vector"],
  ["Vixen Motor Company"],  ["Volga Associated Automobile"],  ["Volkswagen"],
  ["Volvo"],  ["VPG"],  ["Wallace Environmental"],  ["Yugo"] ["Acura"]
                ]);

        verifier.cols(0)
                .keypath([
                  ["1980s"], ["1990s"], ["2000s"], ["2010s"]
                ]);

        verifier.cols(1)
                .keypath([
                  ["1980s", "1984"], ["1980s", "1985"], ["1980s", "1986"]
                ]);

        done();
      })  

    })

    it('2x2 offsets', function(done){
      var rowvars = buildvars([
        [function(r){ return ""; }, d3.ascending],
        [fetchfn('make'), insensitive]
      ]);
      var colvars = buildvars([
        [function(r){ return ""; }, d3.ascending],
        [fetchfn('year'), d3.ascending]
      ]);

      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
       
        var verifier = matrixVerifier(act);
        var row = { level: 1, keypath: ["", "Kia"], index: 61 }
          , col = { level: 1, keypath: ["", "2013"], index: 29 }

        verifier.offsets(row, col, [
          [0,0], [null,0], [0,null], [null,null]
        ]).diff([
          26.528, 23.245, 23.070, 19.780
        ]);

        verifier.offsetsIntra(row, col, [
          [0,0], [-1,0], [-1,-1], [0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1]
        ]).diff([
          26.528, undefined, undefined, 25.622, undefined, undefined, undefined, 26.086, undefined
        ]).missing([
          1,2,4,5,6,8
        ]);

        done();

      })

    })

  })

  describe('matrix.table', function(){

    it('1x1', function(done){
      var rowvars = buildvars([[fetchfn('make'), insensitive]]);
      var colvars = buildvars([[fetchfn('year'), d3.ascending]]);
     
      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix.table(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
       
        var verifier = tableVerifier(act).row(0);
        verifier.diff([
          undefined,  undefined,  22.000,  20.833,  21.500,  21.500,  20.500,
          19.833,  20.667,  20.091,  20.455,  20.400,  19.700,  20.636,
          20.583,  20.727,  20.714,  20.222,  20.778,  20.800,  21.182,  21.182,
          21.889,  20.250,  20.250,  20.429,  20.455,  21.333,  21.583,  23.929,
          24.750,  22.500
        ]).missing([0,1]);
       
        verifier = tableVerifier(act).col(14);
        verifier.diff([
  20.583,  undefined,  undefined,  undefined,  undefined,  15.000,  19.824,
  undefined,  undefined,  undefined,  undefined,  11.857,  undefined,  undefined,
  undefined,  20.107,  undefined,  undefined,  20.444,  undefined,  17.000,
  undefined,  19.182,  20.412,  undefined,  undefined,  undefined,  undefined,
  undefined,  23.250,  undefined,  16.906,  undefined,  21.417,  undefined,
  undefined,  undefined,  undefined,  10.800,  undefined,  undefined,  17.118,
  undefined,  undefined,  15.409,  undefined,  undefined,  undefined,  24.304,
  undefined,  22.727,  undefined,  undefined,  18.750,  undefined,  17.765,
  undefined,  17.833,  undefined,  16.063,  undefined,  20.500,  undefined,
  undefined,  10.000,  13.250,  18.143,  15.800,  undefined,  undefined,  16.000,
  undefined,  undefined,  undefined,  19.864,  undefined,  undefined,  18.333,
  20.316,  undefined,  undefined,  20.314,  undefined,  20.667,  20.636,
  undefined,  undefined,  undefined,  undefined,  undefined,  undefined,
  undefined,  21.545,  21.278,  17.800,  21.000,  undefined,  undefined,
  undefined,  undefined,  11.500,  undefined,  undefined,  undefined,  20.250,
  undefined,  undefined,  26.333,  undefined,  undefined,  undefined,  undefined,
  undefined,  undefined,  22.111,  undefined,  23.455,  undefined,  undefined,
  undefined,  20.891,  undefined,  undefined,  undefined,  undefined,  25.038,
  19.450,  undefined,  undefined,  undefined
         ]).exists([  0,  5,  6, 11, 15, 18, 20, 22, 23, 29, 31, 33, 38, 41, 44, 48,
                     50, 53, 55, 57, 59, 61, 64, 65, 66, 67, 70, 74, 77, 78, 81, 83,
                     84, 92, 93, 94, 95,100,104,107,114,116,120,125,126
         ]);

        done();
      })

    })

    it('2x2', function(done){
      var rowvars = buildvars([
        [fetchfn('make'), insensitive],
        [fetchfn('VClass'), insensitive]
      ]);
      var colvars = buildvars([
        [function(r){ return r['year'].slice(0,3) + '0s'; }, d3.ascending],
        [fetchfn('year'), d3.ascending]
      ]);

      var rollup = function(d){ return d3.mean(d, fetchfn('comb08')); }

      var act = matrix.table(rowvars, colvars);

      d3.csv('fixtures/vehicles.csv').get( function(err,data){
        if (err) done(err);
        act.data(data, rollup);
      
        var verifier = tableVerifier(act)
        verifier.row(80)
                .diff([
  17.200,  19.571,  18.333,  18.000,  17.333,  18.000,  16.667,  17.000,
  18.000,  17.000,  17.667,  17.750,  18.000,  18.000,  16.000,  18.000,
  19.000,  18.000,  17.000,  16.000,  16.800,  16.600,  15.600,  16.500,
  16.500,  16.000,  16.000,  15.333,  undefined,  20.500,  20.000,  undefined
        ])
          .missing([28,31]);


        verifier.cols()
                .keypath([
                  ["1980s", "1984"], ["1980s", "1985"], ["1980s", "1986"]
                ]);

        verifier.rows()
                .keypath([
                   ["Acura", "Compact Cars"], ["Acura", "Midsize Cars"]
                ]);

        done();
      })
    })

  })

  ////////////////////  data verifier utilities

  function tableVerifier(table){
    var instance = {}
    
    instance.rowlength = function(exp){
      var act = table.rows()
      assert(act, "Expected table.rows(), was " + act);
      assert.equal(act.length, exp, 
        "Expected table.rows() length to be " + exp + ", was " + act.length
      );
    }

    instance.collength = function(exp){
      var act = table.cols()
      assert(act, "Expected table.cols(), was " + act);
      assert.equal(act.length, exp, 
        "Expected table.cols() length to be " + exp + ", was " + act.length
      );
    }

    instance.rows = function(){
      var rows = table.rows();
      var ret = multiVerifier();
      for (var i=0;i<rows.length;++i){
        ret.add( rowcolVerifier( rows[i] ) );
      }
      return ret;
    }

    instance.cols = function(){
      var cols = table.cols();
      var ret = multiVerifier();
      for (var i=0;i<cols.length;++i){
        ret.add( rowcolVerifier( cols[i] ) );
      }
      return ret;
    }

    instance.row = function(nrow){
      var ret = multiVerifier();
      var ncols = table.cols().length;
      for (var i=0; i<ncols; ++i){
        ret.add( valueVerifier(table.fetchCoord(nrow,i)) );
      }
      return ret;
    }

    instance.col = function(ncol){
      var ret = multiVerifier();
      var nrows = table.rows().length;
      for (var i=0; i<nrows; ++i){
        ret.add( valueVerifier(table.fetchCoord(i,ncol)) );
      }
      return ret;
    }

    return instance;
  }

  function matrixVerifier(matrix){
    var instance = {}

    instance.dimensions = function(rmax,cmax){
      var act = matrix.rows()
      assert(act, "Expected matrix.rows(), was " + act);
      assert.equal(act.length, rmax, 
        "Expected matrix.rows() length to be " + rmax + ", was " + act.length
      );
      act = matrix.cols()
      assert(act, "Expected matrix.cols(), was " + act);
      assert.equal(act.length, cmax, 
        "Expected matrix.cols() length to be " + cmax + ", was " + act.length
      );
    }
    
    instance.rows = function(level){
      var ret = multiVerifier();
      var rows = matrix.rows()[level];
      assert(rows, "No row level " + level + " in matrix");
      for (var i=0; i<rows.length; ++i){
        ret.add( rowcolVerifier(rows[i]) );
      }
      return ret;
    }

    instance.cols = function(level){
      var ret = multiVerifier();
      var cols = matrix.cols()[level];
      assert(cols, "No col level " + level + " in matrix");
      for (var i=0; i<cols.length; ++i){
        ret.add( rowcolVerifier(cols[i]) );
      }
      return ret;
    }

    instance.cell = function(row,col){
      return valueVerifier( matrix.fetch(row,col) );
    }

    instance.offset = function(row,col,offset){
      return valueVerifier( matrix.fetchOffset(row,col,offset) );
    }

    instance.offsetIntra = function(row,col,offset){
      return valueVerifier( matrix.fetchOffsetIntra(row,col,offset) );
    }

    instance.offsets = function(row,col,offsets){
      var ret = multiVerifier();
      for (var i=0;i<offsets.length;++i){
        ret.add( this.offset(row,col,offsets[i]) );
      }
      return ret;
    }

    instance.offsetsIntra = function(row,col,offsets){
      var ret = multiVerifier();
      for (var i=0;i<offsets.length;++i){
        ret.add( this.offsetIntra(row,col,offsets[i]) );
      }
      return ret;
    }

    return instance;
  }

  function multiVerifier(verifiers){
    var instance = {};
    verifiers = verifiers || [];

    instance.add = function(v){
      verifiers.push(v);
      return this;
    }

    instance.diff = function(exps,d){
      for (var i=0;i<exps.length;++i){
        wrap('item ' + i, function(){
          verifiers[i].diff(exps[i],d)
        });
      }
      return this;
    }
    instance.missing = function(idx){
      for (var i=0;i<verifiers.length;++i){
        if (~idx.indexOf(i)){
          wrap('item ' + i, function(){
            verifiers[i].missing()
          });
        } else {
          wrap('item ' + i, function(){
            verifiers[i].exists()
          });
        }
      }
      return this;
    }
    instance.exists = function(idx){
      for (var i=0;i<verifiers.length;++i){
        if (~idx.indexOf(i)){
          wrap('item ' + i, function(){
            verifiers[i].exists()
          });
        } else {
          wrap('item ' + i, function(){
            verifiers[i].missing()
          });
        }
      }
      return this;
    }

    instance.keypath = function(exp){
      for (var i=0;i<verifiers.length;++i){
        wrap('item ' + i, function(){
          verifiers[i].keypath(exp[i]);
        });
      }
      return this;
    }

    function wrap(msg, fn){
      try {
        fn();
      } catch(e){
        throw new Error(msg + ": " + e);
      }
    }

    return instance;
  }

  function valueVerifier(act){
    var instance = {};

    instance.diff = function(exp,d){
      if (exp == undefined) return this;
      if (d == undefined) d = 0.001;
      assert.diff(act, exp, d);
      return this;
    }
    
    instance.exists = function(exp){
      if (arguments.length == 0) exp = true;
      assert( (!!exp ? !(act == undefined) : (act == undefined) ), 
              "Expected " + (exp ? " exists " : " missing ") + 
              ", was " + (act == undefined ? act : JSON.stringify(act))
            );
      return this;
    }

    instance.missing = function(exp){
      if (arguments.length == 0) exp = true;
      return this.exists(!exp);
    }

    return instance;
  }

  function rowcolVerifier(act){
    var instance = {};

    instance.keypath = function(exp){
      if (exp == undefined) return this;
      assert.deepEqual(act.keypath, exp);
    }

    return instance;
  }

  ///////////////////// utils

  function buildvars(pairs){
    var ret = [];
    pairs.forEach( function(p){
      ret.push( {
        accessor: function(){ return p[0]; },
        sortKeys: function(){ return p[1]; }
      } );
    });
    return ret;
  }

  function fetchfn(name){
    return function(r){
      return r[name];
    }
  }

  function insensitive(a,b){
    if (a==undefined) a = '';
    if (b==undefined) b = '';
    return d3.ascending(a.toString().toLowerCase(), b.toString().toLowerCase());
  }

})
