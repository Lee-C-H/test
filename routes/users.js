var mongoose = require('mongoose');
var Schema = mongoose.Schema

var Schemauser = {};


    var PostSchema = new Schema({
        userId : String,
        userPw : String,
        userName : String,
        userEmail: String
    });


module.exports = mongoose.model('users', PostSchema);