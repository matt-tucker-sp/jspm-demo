/* */ 
var assert = require('should');
var stringifyFunctionBody = require('./util').stringifyFunctionBody;
var annotate = function(arg) {
  return require('../main').annotate(stringifyFunctionBody(arg));
};
describe('annotate', function() {
  it('should annotate declarations on referenced modules', function() {
    var annotated = annotate(function() {
      var myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', function($scope) {});
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      var myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', ['$scope', function($scope) {}]);
    }));
  });
  it('should annotate declarations on referenced modules when reference is declared then initialized', function() {
    var annotated = annotate(function() {
      var myMod;
      myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', function($scope) {});
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      var myMod;
      myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', ['$scope', function($scope) {}]);
    }));
  });
  it('should annotate object-defined providers on referenced modules', function() {
    var annotated = annotate(function() {
      var myMod;
      myMod = angular.module('myMod', []);
      myMod.provider('MyService', {$get: function(service) {}});
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      var myMod;
      myMod = angular.module('myMod', []);
      myMod.provider('MyService', {$get: ['service', function(service) {}]});
    }));
  });
  it('should not annotate declarations on non-module objects', function() {
    var fn = function() {
      var myMod,
          myOtherMod;
      myMod = angular.module('myMod', []);
      myOtherMod.controller('MyCtrl', function($scope) {});
    };
    var annotated = annotate(fn);
    annotated.should.equal(stringifyFunctionBody(fn));
  });
  it('should keep comments', function() {
    var annotated = annotate(function() {
      var myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', function($scope) {});
    });
    annotated.should.equal(stringifyFunctionBody(function() {
      var myMod = angular.module('myMod', []);
      myMod.controller('MyCtrl', ['$scope', function($scope) {}]);
    }));
  });
});
