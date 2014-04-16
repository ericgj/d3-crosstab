'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;

module.exports = crosstab;

function crosstab(){
  
  var rowvars = []
    , colvars = []
    , data
    , summary

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
      return d3.ascending(a.level,b.level) ||
             d3.ascending(a.order,b.order)
    }
    var colsort = rowsort
    
    var instance = {};

    instance.rows = function(){
      // todo
    }

    instance.cols = function(){
      var fn = function(obj,i,j){ 
        return {
          key:   (i < 0 ? "grand" : obj.key),
          label: (i < 0 ? "Grand" : colvars[i].label()),
          level: i,
          order: j,
          final: (obj.values == undefined || obj.values == null)
        }
      }
      return flatkeys(data, colvars.slice(0,cmax), fn )
               .sort(colsort);
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

function flatten(nest,fn,i,accum){
  accum = accum || [];
  i = (i == undefined || i == null ? -1 : 0);  // level == -1 for grand col/row
  nest.forEach( function(obj,j){
    accum.push( fn(obj,i,j) );
    var vals = obj.values;
    if (!(vals == undefined || vals == null)){
      flatten(vals, fn, i+1, accum);
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
  nest = [ { key: null,
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


