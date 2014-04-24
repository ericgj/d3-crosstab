'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;
var hash = require('sha1').hex;

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

  instance.data = function(d){
    data = d;
    return this; 
  }

  instance.rows = function(r){
    rowvars.push(r);
    return this;
  }

  instance.cols = function(c){
    colvars.push(c);
    return this;
  }

  instance.summary = function(key,s){
    sumvars[key] = s;
    return this;
  }

  instance.source = function(bool){
    source = !!bool;
    return this;
  }

  // predefined comparators

  instance.compareTable = function(key, fn){
    addCompareAuto('table', offsetTable, key, fn);
    return this;
  }

  instance.compareRow = function(key, fn){
    addCompareAuto('row', offsetRow, key, fn);
    return this;
  }

  instance.compareCol = function(key, fn){
    addCompareAuto('col', offsetCol, key, fn);
    return this;
  }
  
  instance.compareRowGroup = function(key, fn){
    addCompareAuto('rowgroup', offsetRowGroup, key, fn);
    return this;
  }

  instance.compareColGroup = function(key, fn){
    addCompareAuto('colgroup', offsetColGroup, key, fn);
    return this;
  }

  instance.comparePrevRow = function(key, fn){
    addCompareAuto('prevrow', offsetPrevRow, key, fn);
    return this;
  }

  instance.comparePrevCol = function(key, fn){
    addCompareAuto('prevcol', offsetPrevCol, key, fn);
    return this;
  }

  instance.compareNextRow = function(key, fn){
    addCompareAuto('nextrow', offsetNextRow, key, fn);
    return this;
  }

  instance.compareNextCol = function(key, fn){
    addCompareAuto('nextcol', offsetNextCol, key, fn);
    return this;
  }


  // add custom crosstab.compare()

  instance.compare = function(comp){
    addCompare(comp);
    return this;
  }


  // main 

  instance.layout = function(r,c){
    return layout(r,c);
  }

  function instance(r,c){
    return instance.layout(r,c);
  }


  // private

  function offsetTable(matrix,row,col){ 
    return matrix.fetchOffset(row,col,[null,null]);
  }

  function offsetRow(matrix,row,col){ 
    return matrix.fetchOffset(row,col,[0,null]);  // column zero of current row
  }

  function offsetCol(matrix,row,col){ 
    return matrix.fetchOffset(row,col,[null,0]);  // row zero of current col
  }

  function offsetRowGroup(matrix,row,col){ 
    return matrix.fetchOffset(row,col,[0,-1]);
  }

  function offsetColGroup(matrix,row,col){ 
    return matrix.fetchOffset(row,col,[-1,0]);
  }

  function offsetPrevRow(matrix,row,col){ 
    return matrix.fetchIndexOffset(row,col,[0,-1]);
  }

  function offsetPrevCol(matrix,row,col){ 
    return matrix.fetchIndexOffset(row,col,[-1,0]);
  }

  function offsetNextRow(matrix,row,col){ 
    return matrix.fetchIndexOffset(row,col,[0,1]);
  }

  function offsetNextCol(matrix,row,col){ 
    return matrix.fetchIndexOffset(row,col,[1,0]);
  }

  function addCompareAuto(type, offsetfn, key, fn){
    if (!(has.call(compares,type))){
      compares[type] = crosstab.compare(offsetfn);
    }
    compares[type].add(key, fn);
  }
 
  var ncomp = -1;
  function addCompare(comp){
    compares[ncomp++] = comp;
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

          // fetch cell
          var val = matrix.fetch(row,col)

          // attach metadata
          val.row = row;
          val.col = col;
          val.table = meta;

          // attach comparison calculations 
          applyCompares(val,matrix);

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

    function applyCompares(cell,matrix){
      for (var k in compares){
        var comp = compares[k];
        comp.matrix(matrix);
        comp(cell);
      }
    }

    // utils

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

    return instance; // crosstab.layout
    
  }

  return instance;  // crosstab
  
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
 * Crosstab comparator definition
 *
 * This function allows you to attach multiple comparison functions (percent, 
 * diff, etc.) to a particular comparator (e.g. row/col/table total, prev/next 
 * row/col, etc.).
 *
 * When run on a given (layout) cell, finds the comparison cell and runs each
 * comparison function on each summary property in the cell, merging results
 * under cell.compare.
 *
 * Typical usage (in crosstab definition):
 *
 *   var tabdef = crosstab().summary( 'avg', avgfn('variable') )
 *                          .compare( crosstab.compare( findrowtotal )
 *                                            .add( 'rowpct',  crosstab.compare.pct )
 *                                            .add( 'rowdiff', crosstab.compare.diff)
 *                                  )
 *
 * But note that there are shortcuts for typical cases. So the above can be
 * expressed compactly as:
 *
 *   var tabdef = crosstab().summary( 'avg', avgfn('variable') )
 *                          .compareRow( 'rowpct', crosstab.compare.pct   )
 *                          .compareRow( 'rowdiff', crosstab.compare.diff )
 * 
 */
crosstab.compare = function(find){

  var calcs = {};
  var matrix

  instance.add = function(key, calc){
    calcs[key] = calc;
    return this;
  }

  instance.matrix = function(m){
    matrix = m;
    return this;
  }

  function instance(cell){
    if ( (cell == undefined) ) return instance;
    var comp = find(matrix,cell.row,cell.col);
    cell.compare = cell.compare || {}
    for (var k in calcs){
      var calc = calcs[k];
      var target = cell.compare[k] = {};  // note wipes out any duplicate keys
      if ( (comp == undefined) || 
           (comp.summary == undefined) ) continue;
      if ( (cell.summary == undefined) ) continue;
      for (var s in cell.summary){
        if ( (comp.summary[s] == undefined) ) continue;
        if ( (cell.summary[s] == undefined) ) continue;
        var cellval = cell.summary;
        var compval = comp.summary;
        target[s] = calc( cellval, compval, s );
      }
    }
    return instance;
  }

  return instance;
}

/**
 * Convenience functions for comparison calculations
 *
 */
crosstab.compare.ratio = function(value,comp,key){
  return value[key]/comp[key];
}
crosstab.compare.pct = function(value,comp,key){
  return crosstab.compare.ratio(value,comp,key) * 100;
}
crosstab.compare.diff = function(value,comp,key){
  return value[key] - comp[key];
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
  var keyidx = [];
  var ordidx = [];
  var sizes  = [];

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
    return this.fetchPath(rowlevel,collevel,rowkeys,colkeys);
  }

  instance.fetchIndexOffset = function(row,col,offsets){
    offsets = offsets  || [0,0];
    var rowlevel = row.level
    var collevel = col.level
    var rowcoord = offsetIndex(row.path, offsets[0]);
    var colcoord = offsetIndex(col.path, offsets[1]);
    return this.fetchIndex(rowlevel,collevel,rowcoord,colcoord);
  }

  instance.rowLength = function(rowlevel,collevel){
    return sizes[rowlevel][collevel][0];
  }

  instance.colLength = function(rowlevel,collevel){
    return sizes[rowlevel][collevel][1];
  }

  instance.fetchPath = function(rowlevel,collevel,rowkeys,colkeys){
    var map = keyidx[rowlevel][collevel];
    var store = matrix[rowlevel][collevel];
    var id = map[ hashkeys(rowkeys,colkeys) ]
    if (!(id == undefined) && has.call(store,id)) {
      return store[id];
    } else {
      return rollup([]);
    }
  }
  
  instance.fetchIndex = function(rowlevel,collevel,rowcoord,colcoord){
    var map = ordidx[rowlevel][collevel];
    var store = matrix[rowlevel][collevel];
    var id = map[ hashkeys(rowcoord,colcoord) ];
    if (!(id == undefined) && has.call(store,id)) {
      return store[id];
    } else {
      return undefined;
    }
  }

  instance.data = function(data,fn){
    rollup = fn; matrix = []; keyidx = []; ordidx = []; sizes = []; // reset state
    
    for (var i=0;i<rvars.length;++i){
      matrix[i] = []; keyidx[i] = []; ordidx[i] = []; sizes[i] = [];
   
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
        
        var entries = nest.entries(data);
        matrix[i][j] = []; keyidx[i][j] = {}; ordidx[i][j] = {}; sizes[i][j] = [];

        matrixIndex( entries, [i,j], matrix[i][j], keyidx[i][j], ordidx[i][j], sizes[i][j] );

      }
    }
    return this;
  }

  function instance(d,fn){
    return instance.data(d,fn);
  }

  // utils

  function matrixIndex(nest, dims, store, keys, ords, sizes){
    var rdims = dims[0] + 1;
    var cdims = dims[1] + 1;
    var n = 0;
    traverse( nest, function(obj,key,ord){
      store.push(obj);
      var id = store.length - 1;
      keys[ hashkeys(key.slice(0,rdims), key.slice(rdims)) ] = id;
      ords[ hashkeys(ord.slice(0,rdims), ord.slice(rdims)) ] = id;
      n++;
    });
    sizes.push( n / rdims );
    sizes.push( n / cdims );
  }

  function hashkeys(){
    var args = [].slice.call(arguments,0);
    var str = JSON.stringify(args);
    return hash(str);
  }

  function traverse(nest,fn,keys,ords){
    keys = keys || []; ords = ords || [];
    nest.forEach( function(obj,i){
      var branchkeys = copyarray(keys);
      var branchords = copyarray(ords);
      if (has.call(obj,'key')){
        branchkeys.push(obj.key);
        branchords.push(i);
        if (has.call(obj,'values')){
          if (obj.values.forEach){
            traverse(obj.values, fn, branchkeys, branchords);
          } else {
            fn(obj.values, branchkeys, branchords);
          }
        }
      } else {
        fn(obj, copyarray(keys), copyarray(ords));
      }
    })
  }

  // when null, return 0; else return max(offset,0)
  // in most cases you should only pass null, 0, or -1 for n
  function offsetLevel(n, diff){
    if (diff == undefined || diff == null) return 0;
    return ((n + diff < 0) ? 0 : n + diff);
  }

  // return path array with offset elements sliced off the end
  function offsetPath(path, diff){
    return path.slice(0, offsetLevel(path.length - 1, diff) + 1);
  }
  
  // return index array with last index set to offset
  function offsetIndex(path, diff){
    var newpath = copyarray(path);
    newpath[newpath.length-1] = offsetLevel(path[path.length-1], diff);
    return newpath;
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

function copyarray(arr){
  return arr.slice(0);
}


