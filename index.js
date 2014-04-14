'use strict';
// note undeclared d3 dependency

module.exports = crosstab;

function crosstab(){
  
  var rowvars = []
    , colvars = []
    , data
    , summary

  function tab.data(d){
    data = d;
    return this; 
  }

  function tab.rows(r){
    rowvars.push(r);
    return this;
  }

  function tab.cols(c){
    colvars.push(c);
    return this;
  }

  function tab.summary(fn){
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
      // TODO sort
      nest = nest.key(rvar.accessor);
    }
    if (cvar){
      // TODO sort
      allcols = d3.nest().key(cvar.accessor).entries(data).map(fetchfn('key'));
      nest = nest.key(cvar.accessor);
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
      var dimmap  = d3.nest().key(dim.accessor).map(d, d3.map);
      var ret = [];
      dimvals.forEach( function(key,i){
        recs = dimmap.get(key) || []; 
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

  instance = {};

  instance.accessor = function(a){
    if (arguments.length == 0){
      return accessor;
    } else {
      accessor = a;
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

  if (arguments.length > 0) instance.accessor(accessor);

  return instance;
}

