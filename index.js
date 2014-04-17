'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;

module.exports = crosstab;

function crosstab(){
  
  var rowvars = []
    , colvars = []
    , data = []
    , summary // = function(d){ return d.length; }  // default count

  tabdef.data = function(d){
    data = d;
    return this; 
  }

  tabdef.rows = function(r){
    rowvars.push(r);
    return this;
  }

  tabdef.cols = function(c){
    colvars.push(c);
    return this;
  }

  tabdef.summary = function(fn){
    summary = fn;
    return this;
  }

  tabdef.layout = function(r,c){
    return layout(r,c);
  }

  function tabdef(r,c){
    return tabdef.layout(r,c);
  }


  function layout(rmax,cmax){
   
    if (rmax == undefined || rmax == null) rmax = rowvars.length;
    if (cmax == undefined || cmax == null) cmax = colvars.length;

    var rowsort = function(a,b){ 
      return d3.ascending(a.index,b.index);
    }
    var colsort = rowsort;
    
    var instance = {};

    instance.datarows = function(){
      var matrix = this.matrix()
        , rows = this.rows()
        , cols = this.cols()

      var ret = [];
      rows.forEach( function(row,i){
        var datarow = []
        cols.forEach( function(col,j){
          var tab = matrix[row.level][col.level]
          var val = nestfetch(tab, row.keypath, col.keypath, summary); 
          ret.push(val);
        })
      })
      return ret;
    }

    instance.matrix = function(){

      /*
         [ [0,0], [1,0] ]
         [ [0,1], [1,1] ]
      */ 

      var zero = crosstab.dim(function(){return '';})
      var rvars = []
        , cvars = [] 
      rvars.push(zero);
      rvars.push.apply(rvars, rowvars.slice(0,rmax));
      cvars.push(zero);
      cvars.push.apply(cvars, colvars.slice(0,cmax));

      function rollup(d){
        return {
          summary: summary(d),
          original: d
        };
      }
      
      var ret = [];
      for (var i=0;i<rvars.length;++i){
        ret[i] = [];
        for (var j=0;j<cvars.length;++j){
          var nest = d3.nest().rollup(rollup);
          for (var lvl=0;lvl<=i;++lvl){
            nest.key(rvars[lvl].accessor())
                .sortKeys(rvars[lvl].sortKeys())
          }
          for (var lvl=0;lvl<=j;++lvl){
            nest.key(cvars[lvl].accessor())
                .sortKeys(cvars[lvl].sortKeys())
          }
          ret[i][j] = nest.map(data,d3.map);
        }
      }

      return ret;
    }

    instance.rows = function(){
      return flatdims( rowvars.slice(0,rmax), rowsort);
    }

    instance.cols = function(){
      return flatdims( colvars.slice(0,cmax), colsort);
    }

    function flatdims(dims,sortfn){
      var insertord = 0;  // controls default order (depth-first)

      var fn = function(obj,path,keypath){ 
        var level = path.length - 1
          , order = path.slice(-1)[0];
        return {
          key:   (level == 0 ? "grand" : obj.key),
          label: (level == 0 ? "Grand" : dims[level-1].label()),
          level: level,
          order: order,
          path:  path,
          keypath: keypath,
          index: insertord++,
          final: (obj.values == undefined || obj.values == null)
        }
      }
      return flatkeys(data, dims, fn )
               .sort(sortfn);
    }



    return instance;
    
  }


  /////////////////////// remove
  function oldtab(r,c){

    // future
    // var rvars = r.map(function(i){ return rowvars[i]; });
    // var cvars = c.map(function(i){ return colvars[i]; });

    if (data == undefined) throw new ReferenceError('data is not defined');

    var rvar, cvar, allcols
    rvar = (r == undefined || r == null ? undefined : rowvars[r]);
    cvar = (c == undefined || c == null ? undefined : colvars[c]);

    var rollupfn = function(d){
      return {
        rowlabel: rvar ? rvar.label() : "Grand",
        collabel: cvar ? cvar.label() : "Grand",
        summary: summary(d),
        original: d
      };
    }

    var nest = d3.nest().rollup( rollupfn );

    if (rvar){
      nest = nest.key(rvar.accessor()).sortKeys(rvar.sortKeys());
    }
    if (cvar){
      allcols = d3.nest().key(cvar.accessor()).sortKeys(cvar.sortKeys())
                  .entries(data)
                    .map(fetchfn('key'));
      nest = nest.key(cvar.accessor()).sortKeys(cvar.sortKeys());
    }

    var ret = nest.entries(data);
    if (rvar && cvar) normalize(ret, allcols, rollupfn);
    return ret;
  }
  ///////////////////////////

  return tabdef;
  
}

crosstab.dim = function(accessor){

  var label
    , instance
    , sortKeys = d3.ascending

  instance = {};

  instance.accessor = function(a){
    if (arguments.length == 0){
      return accessor;
    } else {
      accessor = (typeof a == 'function' ? a : fetchfn(a));
      return this;
    }
  }

  instance.label = function(l){
    if (arguments.length == 0){
      return label;
    } else {
      label = l;
      return this;
    }
  }

  instance.sortKeys = function(s){
    if (arguments.length == 0){
      return sortKeys;
    } else {
      sortKeys = s;
      return this;
    }
  }
  
  if (arguments.length > 0) instance.accessor(accessor);

  return instance;
}


// utils

function fetchfn(str){
  return function(r){
    var val = r[str];
    return (typeof val == 'function' ? val() : val);
  }
}

function nestfetch(nest, rowkeys, colkeys, defaultfn){
  for (var i=0;i<rowkeys.length;++i){
    nest = nest.get(rowkeys[i])
  }
  for (var i=0;i<colkeys.length;++i){
    nest = nest.get(colkeys[i])
  }
  if (nest == undefined) nest = defaultfn([]);
  return nest;
}

function copyarray(arr){
  var ret = [];
  for (var i=0;i<arr.length;++i) ret.push(arr[i]);
  return ret;
}

function flatten(nest,fn,path,keypath,accum){
  accum = accum || [];
  path = path || [];
  keypath = keypath || [];
  nest.forEach( function(obj,order){
    var newpath = copyarray(path)
      , newkeypath = copyarray(keypath);
    newpath.push(order);
    newkeypath.push(obj.key);
    accum.push( fn(obj,newpath,newkeypath) );
    var vals = obj.values;
    if (!(vals == undefined || vals == null)){
      flatten(vals, fn, newpath, newkeypath, accum);
    }
  });
  return accum;
}

function flatkeys(data,dims,fn){
  var nest = d3.nest().rollup(function(){ return null; });
  for (var i=0; i<dims.length; ++i){
    var dim = dims[i];
    nest.key(dim.accessor())
        .sortKeys(dim.sortKeys());
  }

  // enclose in top-level nest for "grand" column
  nest = [ { key: '',
             values: nest.entries(data)
           } ]

  return flatten(nest,fn);
}


function normalize(nest,dimvals,fn){
  nest.forEach( function(row){
    var vals = {};
    row.values.forEach( function(col){
      vals[col.key] = col;
    })
    
    row.values = dimvals.map( function(key,i){
      if (has.call(vals,key)){
        return vals[key];
      } else {
        return {
          key: key,
          values: fn([],i)
        }
      }
    })
  })
}


