
var mongoose = require("mongoose");

var folioSchema = mongoose.Schema({
  worktype: Boolean,
  value: String
  //links: Array,
});
var noop = function() {};



var Portfolio = mongoose.model("Portfolio", folioSchema);
module.exports = Portfolio;
