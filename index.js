'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;
var matrix = require('./matrix.js');

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
    , source = false

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

  instance.compareNextRow = function(key, fn){
    addCompareAuto('nextrow', offsetNextRow, key, fn);
    return this;
  }

  instance.comparePrevCol = function(key, fn){
    addCompareAuto('prevcol', offsetPrevCol, key, fn);
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

  function offsetTable(mtx,row,col){ 
    return mtx.fetchOffset(row,col,[null,null]);
  }

  function offsetRow(mtx,row,col){ 
    return mtx.fetchOffset(row,col,[0,null]);
  }

  function offsetCol(mtx,row,col){ 
    return mtx.fetchOffset(row,col,[null,0]);
  }

  function offsetRowGroup(mtx,row,col){ 
    return mtx.fetchOffset(row,col,[0,-1]);
  }

  function offsetColGroup(mtx,row,col){ 
    return mtx.fetchOffset(row,col,[-1,0]);
  }

  function offsetPrevRow(mtx,row,col){ 
    return mtx.fetchOffsetIntra(row,col,[-1,0]);
  }

  function offsetNextRow(mtx,row,col){ 
    return mtx.fetchOffsetIntra(row,col,[1,0]);
  }

  function offsetPrevCol(mtx,row,col){ 
    return mtx.fetchOffsetIntra(row,col,[0,-1]);
  }

  function offsetNextCol(mtx,row,col){ 
    return mtx.fetchOffsetIntra(row,col,[0,1]);
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
   *   layout.sortDims({Integer})  sort rows and cols with summary levels
   *                               in order (1) or reverse order (-1), i.e.
   *                               with summary dimensions before (1) or 
   *                               after (-1) detail dimensions.
   *
   *   layout.colsort({Function})  explicit sort function for columns
   *
   *   layout.rowsort({Function})  explicit sort function for rows
   *
   *
   * generation:
   *   
   *   layout.data({Array})        generate flattened table from raw data
   *
   */
  function layout(rmax,cmax){
   
    if (rmax == undefined) rmax = rowvars.length;
    if (cmax == undefined) cmax = colvars.length;

    var rowsort, colsort;
    var granddim = crosstab.dim( function(){ return ""; })
                           .label( "Grand" );

    instance.sortDims = function(dir){
      rowsort = pathsortfn(dir);
      colsort = pathsortfn(dir);
      return this;
    }
    
    instance.rowsort = function(fn){
      rowsort = fn;
      return this;
    }
    
    instance.colsort = function(fn){
      colsort = fn;
      return this;
    }

    instance.data = function(data){
      var rvars = rowvars.slice(0,rmax)
        , cvars = colvars.slice(0,cmax)
      rvars.unshift( granddim );
      cvars.unshift( granddim );
      
      var mtx = matrix(rvars,cvars)
                  .data(data,rollup)
        , rows = flatarray(mtx.rows()).sort(rowsort)
        , cols = flatarray(mtx.cols()).sort(colsort)

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

      var datarows = [];
      rows.forEach( function(row,i){
        var datarow = []
        row.table = meta;
        row.label = rvars[row.level].label();

        cols.forEach( function(col,j){
          col.table = meta;
          col.label = cvars[col.level].label();
          
          // fetch cell
          var val = mtx.fetch(row,col)

          // attach metadata
          val.row = row;
          val.col = col;
          val.table = meta;

          // attach comparison calculations 
          applyCompares(val,mtx);

          datarow.push(val);
        })
        datarows.push(datarow);
      })
      
      return {
        rows: rows,
        cols: cols,
        data: datarows,
        table: meta
      };
    }

    function instance(data){
      return instance.data(data);
    }
    
    instance.sortDims(1);  // default sort summary dims before

    // private

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
 
    function applyCompares(cell,mtx){
      for (var k in compares){
        var comp = compares[k];
        comp.matrix(mtx);
        comp(cell);
      }
    }

    function pathsortfn(dir){
      if (arguments.length == 0) dir = 1;
      function sort(a,b){
        if (a.length == 0 || b.length == 0){
          return dir * (a.length - b.length);
        }
        return a[0] > b[0] ? 1 : ( 
                 a[0] < b[0] ? -1 : ( 
                   sort(a.slice(1),b.slice(1)) 
                 )
               );
      }
      return function(a,b){ return sort(a.path,b.path); };
    }

    return instance;  // layout
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

// note only flattens top level
function flatarray(arr){
  var ret = [];
  for (var i=0;i<arr.length;++i){
    ret.push.apply(ret, arr[i]);
  }
  return ret;
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
  var mtx

  instance.add = function(key, calc){
    calcs[key] = calc;
    return this;
  }

  instance.matrix = function(m){
    mtx = m;
    return this;
  }

  function instance(cell){
    if ( (cell == undefined) ) return instance;
    var comp = find(mtx, cell.row, cell.col);
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


