'use strict';

var crosstab = require('d3-crosstab')

function avgfn(name){
  return function(d){ 
    return d3.mean(d, function(r){ return r[name]; }); 
  }
}

var tabs = {}
tabs['1x1'] = crosstab().summary( avgfn('comb08') ).source(true)
                        .cols( crosstab.dim('year').label('Year') )
                        .rows( crosstab.dim('VClass').label('Vehicle Class') );

// This basically fits 11 columns + triple-wide row labels, at 100%
// and extends the width of the whole table accordingly if > 11 columns
// not sure exactly how the math works, but anyway.
function tablewidth(table){
  return ((table.cols.length + 2) * (100/13)) + '%';
}

function cellwidth(d){
  return (100 / (d.table.cols.length + 2)) + '%';
}

function labelwidth(row){
  return ((100 / (row.table.cols.length + 2)) * 3) + '%';
}

function colclass(r){
  return 'c' + r.level;
}

function rowclass(r){
  return 'r' + r.level;
}

function cellclass(r){
  return colclass(r.col) + " " + rowclass(r.row);
}

function labeltext(r){
  return (r.order == 0 ? r.label + ": " + r.key : r.key);
}

function celltext(r){
  return (r.summary == undefined ? "" : d3.round(r.summary,1));
}

describe('render', function(){

  it('should render 1x1', function(done){

    d3.csv('fixtures/vehicles.csv').get( function(err,data){
      if (err) done(err);
      var tab = tabs['1x1']
      tab.data(data);
      var layout = tab().table();

      // console.log('render 1x1 rows: %o', layout.rows);

      // selections
      var table = d3.select('#render').classed('table',true)

      var colrow = table.append('div').classed('row label',true); // label row
          colrow.append('div').classed('cell',true);  // blank corner cell

      var collabels = colrow.selectAll('.cell.label')

      var cellrows = table.selectAll('.row.data')

      // binding data
      table = table.datum(layout.table)
                     .style('width', tablewidth);
      collabels = collabels.data(layout.cols);
      cellrows = cellrows.data(layout.data);

      //// data join actions

      // append col label cells
      collabels = collabels.enter()
                           .append('div').property('className',colclass).classed('cell label',true)
                             .text(labeltext)

      // append data rows and row label cells
      cellrows = cellrows.enter()
                         .append('div').classed('row data',true);
                 cellrows.append('div').classed('cell label',true);

      // bind cell data (sub-selection)
      var cells = cellrows.selectAll('.cell.data')
                          .data(function(d){return d;})

      // append data cells
      cells = cells.enter()
                   .append('div').property('className',cellclass).classed('cell data',true)
                     .style('width', cellwidth)
                     .text(celltext)

      // bind row label data (already created cells above, no need for enter action)
      var rowlabels = table.selectAll('.row.data > .cell.label')
                          .data(layout.rows)
                        .property('className',rowclass)
                        .classed('cell label', true)
                        .style('width', labelwidth)
                        .text(labeltext)

      done();

     })

  })

})

