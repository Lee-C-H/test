var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var session = require('express-session');
var mongoose    = require('mongoose');

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var db = mongoose.connection;
db.on('error', console.error);
db.once('open', function(){
    console.log("Connected to mongod server");
});
mongoose.connect('mongodb://test:ckdghks1!@ds123490.mlab.com:23490/bbs');

var server = app.listen(3000, function(){
 console.log("Express server has started on port 3000");
});

app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(session({
 secret: '@#@$MYSIGN#@$#$',
 resave: false,
 saveUninitialized: true
}));

var router = require('./routes')(app);