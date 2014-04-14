'use strict';

var connect = require('connect');
var dir = require('serve-static');
var app = connect();

app.use(dir(__dirname));
app.use(dir(__dirname + '/..'));
app.use(dir(__dirname + '/fixtures'));

app.listen(8080);


