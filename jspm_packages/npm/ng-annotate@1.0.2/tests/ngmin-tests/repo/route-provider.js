/* */ 
var assert = require('should');
var stringifyFunctionBody = require('./util').stringifyFunctionBody;
var annotate = function(arg) {
  return require('../main').annotate(stringifyFunctionBody(arg));
};
describe('annotate', function() {
  it('should annotate $routeProvider.when()', function() {
    var annotated = annotate(function() {
      angular.module('myMod', []).config(function($routeProvider) {
        $routeProvider.when('path', {controller: function($scope) {
            $scope.works = true;
          }});
      });
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      angular.module('myMod', []).config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('path', {controller: ['$scope', function($scope) {
            $scope.works = true;
          }]});
      }]);
    }));
  });
  it('should annotate chained $routeProvider.when()', function() {
    var annotated = annotate(function() {
      angular.module('myMod', []).config(function($routeProvider) {
        $routeProvider.when('path', {controller: function($scope) {
            $scope.works = true;
          }}).when('other/path', {controller: function($http) {
            $http.get();
          }});
      });
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      angular.module('myMod', []).config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('path', {controller: ['$scope', function($scope) {
            $scope.works = true;
          }]}).when('other/path', {controller: ['$http', function($http) {
            $http.get();
          }]});
      }]);
    }));
  });
});
