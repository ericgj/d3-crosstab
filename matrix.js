'use strict';

var has = hasOwnProperty;

module.exports = matrix;

/**
 * matrix
 * a collection of matrix.tables for each row-col level combination
 * 
 * Note: this is the interface from crosstab to the summarized data.
 * 
 * Generation:
 *
 *   var m = matrix(rowvars, colvars)
 *             .data(data, rollup);   // generate tables
 *   
 * Querying:
 *
 *   m.rows();   // array of array of row objects, one per row level
 *   m.cols();   // array of array of col object, one per col level
 *
 *   m.fetch(row,col);                  // rollup data at given row and col
 *   m.fetchOffset(row,col,[null,0])    // fetch col total for given row/col
 *   m.fetchOffsetIntra(row,col,[0,-1]) // fetch prev col for given row/col
 *
 * TODO offset conventions to be documented.
 *
 */
function matrix(rvars,cvars){
  var tables
    , rollup
  
  // note: by level
  instance.rows = function(){
    var ret = [];
    for (var i=0, t; t=tables[i]; ++i){
      ret.push(t[0].rows());
    }
    return ret;
  }

  // note: by level
  instance.cols = function(){
    var ret = [];
    for (var i=0, t; t=tables[0][i]; ++i){
      ret.push(t.cols());
    }
    return ret;
  }

  // row and col are expected to have level and keypath properties 
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

  instance.fetchOffsetIntra = function(row,col,offsets){
    offsets = offsets || [0,0];
    var rowlevel = row.level;
    var collevel = col.level;
    var row = offsetLevel(row.index, offsets[0]);
    var col = offsetLevel(col.index, offsets[1]);
    return this.fetchCoord(rowlevel,collevel,row,col);
  }

  instance.fetchPath = function(rowlevel,collevel,rowkeys,colkeys){
    var table = tables[rowlevel][collevel];
    return tableFetch(table,rowkeys,colkeys,'fetchPath');
  }

  instance.fetchCoord = function(rowlevel,collevel,r,c){
    var table = tables[rowlevel][collevel];
    return tableFetch(table,r,c,'fetchCoord');
  }

  instance.data = function(data,fn){
    rollup = fn;
    tables = 
      combineMap(rvars,cvars, function(xvars,yvars){
        return matrix.table( xvars,yvars ).data(data,rollup);
      });
    return this;
  }

  function instance(data,fn){
    return instance.data(data,fn);
  }

  // private

  function tableFetch(table,r,c,meth){
    var ret = table[meth](r,c);
    if (ret == undefined){
      return rollup ? rollup([]) : [];
    } else {
      return ret;
    }
  }
  
  // utils

  /**
   * when null, return 0; else return max(offset,0)
   * in most cases you should only pass null, 0, or -1 for n
   */
  function offsetLevel(n, diff){
    if (diff == undefined || diff == null) return 0;
    return ((n + diff < 0) ? 0 : n + diff);
  }

  // return path array with offset elements sliced off the end
  function offsetPath(path, diff){
    return path.slice(0, offsetLevel(path.length - 1, diff) + 1);
  }

  function combineMap(a,b,fn){
    var ret = [];
    for (var i=0;i<a.length;++i){
      ret[i] = ret[i] || [];
      for (var j=0;j<b.length;++j){
        ret[i][j] = fn( a.slice(0,i+1), b.slice(0,j+1) );
      }
    }
    return ret;
  }

  return instance;    // matrix()
}

/**
 * matrix.table
 * accessors for single crosstab table
 *
 * Note: internal.
 *
 */
matrix.table = function(rvars,cvars,hash){
  var idx, colidx, rowidx
  
  instance.fetch = function(rkeys,ckeys,idxkey){
    idxkey = idxkey || 'key'
    return idx && idx.fetch(idxkey, [rkeys,ckeys]);
  }

  instance.fetchPath = function(rkeys,ckeys){
    return this.fetch(rkeys,ckeys,'key');
  }

  instance.fetchCoord = function(r,c){
    return this.fetch(r,c,'coord');
  }

  instance.fetchCol = function(key,idxkey){
    idxkey = idxkey || 'key'
    return colidx && colidx.fetch(idxkey,key);
  }

  instance.fetchColIndex = function(i){
    return this.fetchCol(i,'index');
  }

  instance.fetchRow = function(key,idxkey){
    idxkey = idxkey || 'key'
    return rowidx && rowidx.fetch(idxkey,key);
  }

  instance.fetchRowIndex = function(i){
    return this.fetchRow(i,'index');
  }

  instance.cols = function(){
    var ret = [], col;
    for (var i=0, col; col=this.fetchColIndex(i); ++i){
      ret.push(col);
    }
    return ret;
  }

  instance.rows = function(){
    var ret = [], row;
    for (var i=0, row; row=this.fetchRowIndex(i); ++i){
      ret.push(row);
    }
    return ret;
  }

  instance.data = function(data,rollup){
    var dims    = [];  
    dims.push.apply(dims,rvars);
    dims.push.apply(dims,cvars);
    var nest    = nestDims(data,dims,rollup)
      , rownest = nestDims(data,rvars)
      , colnest = nestDims(data,cvars)

    rowidx = store(hash);
    indexNest(rowidx, rownest, rvars.length);

    colidx = store(hash);
    indexNest(colidx, colnest, cvars.length);

    idx = store(hash);
    indexTable(idx, nest, rvars.length, cvars.length, colidx);
    
    return this;
  }

  function instance(data,rollup){
    return instance.data(data,rollup);
  }

  // utils

  function nestDims(data,dims,rollup){
    var ret = d3.nest();
    if (rollup) ret.rollup(rollup);
    for (var i=0, dim; dim=dims[i]; ++i){
      ret.key(dim.accessor());
      ret.sortKeys(dim.sortKeys());
    }
    return ret.entries(data);
  }

  function indexNest(target, nest, depth){
    var i=0;
    traverse(nest, depth, function(keys,ords,values){
      var info = {
        key: keys[keys.length - 1],
        keypath: keys,
        path: ords,
        index: i++,
        level: depth - 1
      }
      target.index('key', keys, info );
      target.index('ord', ords, info );
      target.index('index', info.index, info);
    });
  }

  function indexTable(target, nest, rowdepth, coldepth, colidx){
    var i=-1;
    traverse(nest, rowdepth, function(rowkeys,rowords,rowvalues){
      i++;
      traverse(rowvalues, coldepth, function(colkeys,colords,values){
        var colinfo = colidx.fetch('key', colkeys);    // get col info independent of row-col combo
        target.index('key', [rowkeys, colkeys], values);
        target.index('ord', [rowords, colinfo.path], values);
        target.index('coord', [i, colinfo.index], values);
      });
    }); 
  }

  function traverse(nest,depth,fn,keys,ords){
    keys = keys || [];
    ords = ords || [];
    if (depth == 0) {
      if (has.call(nest,'values')){    // leafs
        fn(keys,ords,nest.values);
      } else {                         // branches
        fn(keys,ords,nest);
      } 
      return;
    }
    nest.forEach( function(obj,ord){
      var branchkeys = copyarray(keys)
        , branchords = copyarray(ords)
      branchkeys.push(obj.key);
      branchords.push(ord);
      traverse(obj.values, depth - 1, fn, branchkeys, branchords);
    });
  }


  return instance;
}


/**
 * store
 * a simple multi-key hash
 *
 * Note: internal.
 *
 */
function store(hash){

  var idx = {}
    , size = 0

  var instance = {};
  hash = hash || JSON.stringify;
  
  instance.size = function(){
    return size;
  }

  instance.index = function(idxkey,key,value){
    var s = idx[idxkey] = idx[idxkey] || {};
    s[ hash(key) ] = value;
    size++;
    return this;
  }

  instance.fetch = function(idxkey,key){
    var s = idx[idxkey] || {};
    return s[ hash(key) ];
    return this;
  }

  instance.debug = function(){
    return idx;
  }

  return instance;
}





function copyarray(arr){
  return arr.slice(0);
}

