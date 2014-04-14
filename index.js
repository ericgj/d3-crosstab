'use strict';
// note undeclared d3 dependency

var has = hasOwnProperty;

module.exports = crosstab;

function crosstab(){
  
  var rowvars = []
    , colvars = []
    , data
    , summary

  tab.data = function(d){
    data = d;
    return this; 
  }

  tab.rows = function(r){
    rowvars.push(r);
    return this;
  }

  tab.cols = function(c){
    colvars.push(c);
    return this;
  }

  tab.summary = function(fn){
    summary = fn;
    return this;
  }

  function tab(r,c){

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
  
  return tab;
  
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
    return r[str];
  }
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


