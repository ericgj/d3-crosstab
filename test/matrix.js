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

describe('matrix', function(){

  //////////////////////// data verifier utilities

  function matrixVerifier(matrix,rowlevel,collevel){
    var instance = {};

    instance.path = function(rowpath,colpath){
      var row = { level: rowlevel, keypath: rowpath};
      var col = { level: collevel, keypath: colpath};
      var act = matrix.fetch(row,col);
      return valueVerifier(act);
    }

    instance.offset = function(rowpath,colpath,offset){
      var row = { level: rowlevel, keypath: rowpath};
      var col = { level: collevel, keypath: colpath};
      var act = matrix.fetchOffset(row,col,offset);
      console.log('verifying value: %o  at: %o, %o offset: %o', act, row.keypath, col.keypath, offset);
      return valueVerifier(act);
    }

    instance.indexOffset = function(rowpath,colpath,offset){
      var row = { level: rowlevel, path: rowpath};
      var col = { level: collevel, path: colpath};
      var act = matrix.fetchIndexOffset(row,col,offset);
      console.log('verifying value: %o  at index: %o, %o offset: %o', act, row.path, col.path, offset);
      return valueVerifier(act);
    }
    
    instance.offsets = function(rowpath,colpath,offsets){
      var self = this;
      return multiVerifier(
        offsets.map( function(offset){
          return self.offset(rowpath,colpath,offset);
        })
      );
    }
      
    instance.indexOffsets = function(rowpath,colpath,offsets){
      var self = this;
      return multiVerifier(
        offsets.map( function(offset){
          return self.indexOffset(rowpath,colpath,offset);
        })
      );
    }

    return instance;
  }

  function multiVerifier(verifiers){
    var instance = {};
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

    instance.summary = function(exp){
      if (exp == undefined) return this;
      assert(has.call(act,'summary'), 'No summary for ' + JSON.stringify(act));
      for (var k in exp){
        assert( has.call(act.summary,k), 'No summary key "' + k + '" for ' + JSON.stringify(act.summary) );
        assert.diff(act.summary[k], exp[k], 0.001);
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
  //////////////////////// 


  it('0x0 matrix', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') ).source(true)

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var matrix = tab().matrix();
      var verifier = matrixVerifier(matrix,0,0);

      // verify inter offsets

      // Note all inter offsets default to the current (origin) cell,
      // so that comparison calcs (percent, diff, etc.) are correct for 
      // the origin.

      var offsets = [
        [    0,    0],
        [ null,    0],
        [ null, null],
        [    0, null],
        [   -1,    0],
        [   -1,   -1],
        [    0,   -1]
      ]

     verifier.offsets([''],[''], offsets)
        .summary([
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 }
        ]).sourceLength([
          34556,
          34556,
          34556,
          34556,
          34556,
          34556,
          34556
        ]);

      
      // verify intra offsets

      // Note all positive ("next") offsets are undefined here
      //   but negative ("prev") offsets default to the current (origin) cell
      // Not sure if this is right, but it's an edge case anyway.
      // I think it does make sense for prev offsets to default to origin
      //   for ease in calculating "running total"-type comparisons

      offsets = [  
        [ 0, 0],
        [-1, 0],
        [-1,-1],
        [ 0,-1],
        [ 1,-1],
        [ 1, 0],
        [ 1, 1],
        [ 0, 1],
        [-1, 1]
      ]

      verifier.indexOffsets([0],[0], offsets)
        .summary([
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          { avg: 19.78 },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]).sourceLength([
          34556,
          34556,
          34556,
          34556,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        ]).missing([4,5,6,7,8]);

      done();
    })
  })

  it('1x1 matrix', function(done){
    var tab = crosstab().summary('avg', avgfn('comb08') ).source(true)
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') );

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      tab.data(data);
      var matrix = tab().matrix();
     
      var verifiers = [
        [ matrixVerifier(matrix,0,0), matrixVerifier(matrix,0,1) ],
        [ matrixVerifier(matrix,1,0), matrixVerifier(matrix,1,1) ]
      ]

      // check inter offsets, for each quadrant

      var offsets = [
        [    0,    0],   // self
        [ null,    0],   // row total
        [ null, null],   // table total
        [    0, null],   // col total
        [   -1,    0],   // row group total
        [   -1,   -1],   // row-col group total ("net")
        [    0,   -1]    // col group total
      ]

      var verifier = verifiers[0][0];
      verifier.offsets([''],[''], offsets)
        .summary([
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 19.78  }
        ]).sourceLength([
          34556,
          34556,
          34556,
          34556,
          34556,
          34556,
          34556
        ]);

      verifier = verifiers[0][1];
      verifier.offsets([''],['','1991'], offsets)
        .summary([
          { avg: 18.826 },
          { avg: 18.826 },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 18.826 },
          { avg: 19.78  },
          { avg: 19.78  }
        ]).sourceLength([
          1132,
          1132,
          34556,
          34556,
          1132,
          34556,
          34556
        ]);

      verifier = verifiers[1][0];
      verifier.offsets(['','Special Purpose Vehicle 2WD'],[''], offsets)
        .summary([
          { avg: 17.580 },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 17.580 },
          { avg: 19.78  },
          { avg: 19.78  },
          { avg: 17.580 }
        ]).sourceLength([
          553,
          34556,
          34556,
          553,
          34556,
          34556,
          553
        ]);
      
      verifier = verifiers[1][1];
      verifier.offsets(['','Subcompact Cars'],['','2004'], offsets)
        .summary([
          { avg: 20.658 },
          { avg: 19.068 },
          { avg: 19.78  },
          { avg: 22.664 },
          { avg: 19.068 },
          { avg: 19.78  },
          { avg: 22.664 }
        ]).sourceLength([
          82,
          1122,
          34556,
          4538,
          1122,
          34556,
          4538
        ]);


      // check intra offsets, for each quadrant, with some missing references
      
      offsets = [  
        [ 0, 0],     // self
        [-1, 0],     // prev row
        [-1,-1],     // prev col, prev row
        [ 0,-1],     // prev col
        [ 1,-1],     // next row, prev col
        [ 1, 0],     // next row
        [ 1, 1],     // next row, next col
        [ 0, 1],     // next col
        [-1, 1]      // prev row, next col
      ]

      // TODO quadrants  0,0  1,0  0,1

      verifier = verifiers[1][1];
      verifier.indexOffsets([0,28],[0,20], offsets)
        .summary([
          {avg: 20.658},
          undefined,
          undefined,
          {avg: 20.694},
          {avg: 18.528},
          {avg: 18.763},
          {avg: 18.279},
          {avg: 20.945},
          undefined
        ]).sourceLength([
          82,
          undefined,
          undefined,
          72,
          53,
          59,
          68,
          73,
          undefined
        ]).missing([1,2,8]);

      verifier.indexOffsets([0,22],[0,2], [ [0, 0], [-1,-1] ])
        .summary([
          {avg: 15.134},
          undefined
        ]).missing([1]);

      done();
    })
  })

  // TODO
  it('2x2 matrix');

})
 
