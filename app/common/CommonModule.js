var angular = require('angular');

var CommonModule = angular.module('CommonModule', [])
.service('commonService', require('./CommonService'));

module.exports = CommonModule;