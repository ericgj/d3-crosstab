'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;

module.exports = crosstab;

/** 
 * Crosstab table definition
 *
 *  var tabdef = crosstab()
 *
 * options (via fluent interface):
 *
 *  tabdef.rows(crosstab.dim())       add row dimension
 *  tabdef.cols(crosstab.dim())       add col dimension
 *  tabdef.summary(String, Function)  rollup function to apply to table cells
 *  tabdef.source(Boolean)            include raw data with cell data (default false)
 *  tabdef.data(Array)                raw data
 *
 * methods:
 *  
 *  tabdef.layout({Integer},{Integer})  layout function with optional max 
 *                                      row, col dimensions specified
 *
 */
function crosstab(){
  
  var rowvars = []
    , colvars = []
    , sumvars = {} 
    , compares = {}
    , data = []
    , source = false

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

  tabdef.summary = function(key,s){
    sumvars[key] = s;
    return this;
  }

  tabdef.source = function(bool){
    source = !!bool;
    return this;
  }

  tabdef.compareRow = function(key, fn){
    return this.compare(key, 
             function(matrix,row,col){ 
               return matrix.fetchOffset(row,col,[null,0]);
             },
             fn
           );
  }
  
  tabdef.compareRowGroup = function(key, fn){
    return this.compare(key,
             function(matrix,row,col){ 
               return matrix.fetchOffset(row,col,[-1,0]);
             },
             fn
           );
  }

  tabdef.comparePrevRow = function(key, fn){
    return this.compare(key,
             function(matrix,row,col){ 
               return matrix.fetchIndexOffset(row,col,[-1,0]);
             },
             fn
           );
  }

  tabdef.compare = function(key, findfn, fn){
    compares[key] = [findfn,fn];
    return this;
  }

  tabdef.layout = function(r,c){
    return layout(r,c);
  }

  function tabdef(r,c){
    return tabdef.layout(r,c);
  }

  
  /**
   * Crosstab layout function
   * For calculating data matrix and flattening into cols, rows, and data-rows
   * for easy rendering.
   *
   * Note the maximum row and column levels (dimensions) can be specified.
   * By default, all defined row and col levels are used, as well as a
   * "grand total" level for row and col.
   *
   *   var layout = tabdef.layout({Integer},{Integer})
   *
   * options (via fluent interface):
   *
   *   layout.colsort(Function)  sort function for columns (FUTURE)
   *   layout.rowsort(Function)  sort function for rows (FUTURE)
   *
   * methods:
   *   
   *   layout.table()     flattened table as {rows, cols, data}
   *   layout.rows()      flattened array of row label data 
   *   layout.cols()      flattened array of col label data 
   *   layout.matrix()    array of array of nest-maps for each dimension combo
   *                      used to construct table()
   */
  function layout(rmax,cmax){
   
    if (rmax == undefined || rmax == null) rmax = rowvars.length;
    if (cmax == undefined || cmax == null) cmax = colvars.length;

    var rowsort = function(a,b){ 
      return d3.ascending(a.index,b.index);
    }
    var colsort = rowsort;
    
    var instance = {};

    instance.table = function(){
      var matrix = this.matrix()
        , rows = this.rows()
        , cols = this.cols()

      var meta = {
        rows: {
          length: rows.length,
          maxlevel: rmax
        },
        cols: {
          length: cols.length,
          maxlevel: cmax
        }
      }

      var ret = [];
      rows.forEach( function(row,i){
        var datarow = []
        row.table = meta;
        cols.forEach( function(col,j){
          col.table = meta;
          var val = matrix.fetch(row,col)
          val.row = row;
          val.col = col;
          val.table = meta;

          // TODO comparison calculations 
          
          datarow.push(val);
        })
        ret.push(datarow);
      })
      
      return {
        rows: rows,
        cols: cols,
        data: ret,
        table: meta
      };
    }

    instance.matrix = function(){
      var zero = crosstab.dim(function(){return '';})
      var rvars = [zero]
        , cvars = [zero] 
      rvars.push.apply(rvars, rowvars.slice(0,rmax));
      cvars.push.apply(cvars, colvars.slice(0,cmax));

      return crosstab.matrix(rvars,cvars).data(data,rollup);
    }

    instance.rows = function(){
      return flatdims( rowvars.slice(0,rmax), rowsort);
    }

    instance.cols = function(){
      return flatdims( colvars.slice(0,cmax), colsort);
    }

    // private methods

    function rollup(d){
      var calcs = {}
      for (var k in sumvars){
        if (has.call(sumvars,k)) calcs[k] = sumvars[k](d);
      }
      return {
        summary: calcs,
        source: (source ? d : undefined)
      };
    }
    
    function flatdims(dims,sortfn){
      var insertord = 0;  // controls default order (depth-first)

      var fn = function(obj,path,keypath){ 
        var level = path.length - 1
          , order = path.slice(-1)[0];
        return {
          key:   (level == 0 ? "" : obj.key),
          label: (level == 0 ? "Grand" : dims[level-1].label()),
          level: level,
          order: order,
          path:  path,
          keypath: keypath,
          index: insertord++,
          final: (obj.values == undefined || obj.values == null)
        }
      }
      var ret = flatkeys(data, dims, fn ).sort(sortfn);
      ret.forEach( function(val){ val.max = insertord; } ); // add max
      return ret;
    }

    return instance;
    
  }

  return tabdef;
  
}

/**
 * Crosstab dimension definition
 * Specify either an accessor function or string (field name)
 * This function determines the (nest) key for the dimension
 *
 *   var dim = crosstab.dim({Function|String})
 *
 * options (via fluent interface):
 *
 *   dim.accessor({Function|String})  get/set accessor
 *   dim.label({String})              get/set label
 *   dim.sortKeys({Function})         get/set sort function for keys
 * 
 */
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


/**
 * Crosstab matrix generation + fetch methods
 * Note fetch "offset" methods can be used in comparison calculations
 * to determine relative row/col  
 *
 *   var matrix = crosstab.matrix(rowvars,colvars);
 *
 * methods:
 *
 *   matrix.data(data, rollup)   Generate matrix for data and rollup function
 *   matrix.fetch(row,col)       Fetch value from layout row and col objects
 *   matrix.fetchOffset(row,col,offsets)   
 *                               Fetch value at inter-hierarchy offset
 *                                (e.g. row/col total or row/col group total)
 *   matrix.fetchIndexOffset(row,col,offsets)  
 *                               Fetch value at intra-hierarchy offset
 *                                (e.g. prev row or col)
 */
crosstab.matrix = function(rvars,cvars){
  
  var rollup;
  var matrix = [];
  var indexes = [];

  // row and col are expected to have level, path and keypath properties 
  instance.fetch = function(row,col){
    return this.fetchPath(row.level,col.level,row.keypath,col.keypath);
  }

  instance.fetchOffset = function(row,col,offsets){
    offsets = offsets || [0,0];
    var rowlevel = offsetLevel(row.level, offsets[0]);
    var collevel = offsetLevel(col.level, offsets[1]);
    var rowkeys = offsetPath(row.keypath, offsets[0]);
    var colkeys = offsetPath(col.keypath, offsets[1]);
    return fetchPath(rowlevel,collevel,rowkeys,colkeys);
  }

  instance.fetchIndexOffset = function(row,col,offsets){
    offsets = offsets  || [0,0];
    var rowlevel = offsetLevel(row.level, offsets[0]);
    var collevel = offsetLevel(col.level, offsets[1]);
    var rowcoord = offsetIndex(row.path, offsets[0]);
    var colcoord = offsetIndex(col.path, offsets[1]);
    return fetchIndex(rowlevel,collevel,rowcoord,colcoord);
  }

  instance.fetchPath = function(rowlevel,collevel,rowkeys,colkeys){
    var map = matrix[rowlevel][collevel]
    return fetch(map,rowkeys,colkeys,rollup);
  }
  
  instance.fetchIndex = function(rowlevel,collevel,rowcoord,colcoord){
    var map = indexes[rowlevel,collevel];
    var keys = fetch(map,rowcoord,colcoord);
    if (keys) return this.fetchPath(rowlevel,collevel,keys[0],keys[1]);
  }

  // generate matrix as array of array of nests
  // and index matrix with [rowpaths,colpaths] as values
  instance.data = function(data,fn){
    rollup = fn; matrix = []; indexes = [];  // reset state
    for (var i=0;i<rvars.length;++i){
      matrix[i] = []; indexes[i] = [];
      for (var j=0;j<cvars.length;++j){
        var nest = d3.nest();
        if (rollup) nest.rollup(rollup);
        for (var lvl=0;lvl<=i;++lvl){
          nest.key(rvars[lvl].accessor())
              .sortKeys(rvars[lvl].sortKeys())
        }
        for (var lvl=0;lvl<=j;++lvl){
          nest.key(cvars[lvl].accessor())
              .sortKeys(cvars[lvl].sortKeys())
        }
        matrix[i][j]  = nest.map(data,d3.map);
        indexes[i][j] = indexPaths(nest.entries(data),rvars.length);
      }
    }
    return this;
  }

  function instance(d,fn){
    return instance.data(d,fn);
  }

  // utils
  
  function fetch(map,rowkeys,colkeys,fn){
    var val = map
    for (var i=0;i<rowkeys.length;++i){
      val = val.get(rowkeys[i])
    }
    for (var i=0;i<colkeys.length;++i){
      val = val.get(colkeys[i])
      if (val == undefined) break;
    }
    if (fn && val == undefined) val = fn([]);
    return val;
  }

  // when null, return 0; else return max(offset,0)
  // in most cases you should only pass null, 0, or -1 for n
  function offsetLevel(n, diff){
    if (diff == undefined || diff == null) return 0;
    return ((n + diff < 0) ? 0 : n + diff);
  }

  // return path array with offset elements sliced off the end
  function offsetPath(path, diff){
    return path.slice(0, offsetLevel(path.length, diff));
  }
  
  // return index array with last index set to offset
  function offsetIndex(path, diff){
    var newpath = copyarray(path);
    newpath[newpath.length-1] = offsetLevel(path[path.length-1], diff);
    return newpath;
  }

  function indexPaths(nest,split,map,accum){
    map    = map    || d3.map();
    accum  = accum  || [[],[]];
    nest.forEach( function(obj,i){
      if (obj.key){
        var branchmap = d3.map();
        parent.set(i,branchmap);
        if (accum[0].length < split){
          accum[0].push(obj.key);
        } else {
          accum[1].push(obj.key);
        }
        if (obj.values){
          var branch = [ copyarray(accum[0]), copyarray(accum[1]) ];
          indexPaths(obj.values, branchmap, branch);
        }
      } else {
        map.set(i,accum);
      }
    })
    return map;
  }


  return instance;
}


// utils

function fetchfn(str){
  return function(r){
    var val = r[str];
    return (typeof val == 'function' ? val() : val);
  }
}


// TODO
function calcCompares(val,coord,compares,lookup){
  ret = {}
  for (var c in compares){
    if (!(has.call(compares,c))) continue;
    var findfn = compares[c][0]
      , fn = compares[c][1]

    var pair = findfn(coord,[val.row.order, val.col.order]);
    if (!pair) continue;
    
    var comp = lookup[ pair[0] ][ pair[1] ];
    if (!comp) continue;

    for (var s in val.summary){
      if (!(has.call(val.summary,s))) continue;
      ret[s] = {}
      ret[s][c] = fn(val.summary[s], comp.summary[s]);
    }
  }
  return ret;
}


function copyarray(arr){
  return arr.slice(0);
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


