'use strict';
// note undeclared d3 dependency

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
    cvar = (r == undefined || r == null ? undefined : colvars[c]);

    var rollupfn = function(d){
      return {
        rowlabel: rvar ? rvar.label() : "Grand",
        collabel: cvar ? cvar.label() : "Grand",
        summary: summary(d),
        original: d
      };
    }

    var nest = d3.nest()

    if (rvar){
      nest = nest.key(rvar.accessor()).sortKeys(rvar.sortKeys());
    }
    if (cvar){
      allcols = d3.nest().key(cvar.accessor()).sortKeys(cvar.sortKeys())
                  .entries(data)
                    .map(fetchfn('key'));
      nest = nest.key(cvar.accessor()).sortKeys(cvar.sortKeys());
    }

    nest = nest.rollup( 
             allcols ? 
               normalize(cvar,allcols,rollupfn) : 
               rollupfn 
           );

    return nest.entries(data);
  }
  
  function normalize(dim,dimvals,fn){
    return function(d){
      var dimmap  = d3.nest().key(dim.accessor()).map(d, d3.map);
      var ret = [];
      dimvals.forEach( function(key,i){
        var recs = dimmap.get(key) || []; 
        ret.push( fn(recs,i) );
      })
      return ret;
    }
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


function fetchfn(str){
  return function(r){
    return r[str];
  }
}

