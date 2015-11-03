/* */ 
"format cjs";
// See repo/INFO for test code origin

// chain.js
//'should annotate chained declarations'
angular.module('myMod', []).
    service('myService',function(dep) {
    }).
    service('MyCtrl', function($scope) {
    });

//'should annotate multiple chained declarations'
angular.module('myMod', []).
    service('myService',function(dep) {
    }).
    service('myService2',function(dep) {
    }).
    service('myService3',function(dep) {
    }).
    service('MyCtrl', function($scope) {
    });

//'should annotate multiple chained declarations on constants', function() {
angular.module('myMod', []).
    constant('myConstant', 'someConstant').
    constant('otherConstant', 'otherConstant').
    service('myService1',function(dep) {
    }).
    service('MyCtrl', function($scope) {
    });

//'should annotate multiple chained declarations on values', function() {
angular.module('myMod', []).
    value('myConstant', 'someConstant').
    value('otherConstant', 'otherConstant').
    service('myService1',function(dep) {
    }).
    service('MyCtrl', function($scope) {
    });

//'should annotate multiple chained declarations on constants and value regardless of order', function() {
angular.module('myMod', []).
    value('myConstant', 'someConstant').
    service('myService1',function(dep) {
    }).
    constant('otherConstant', 'otherConstant').
    service('MyCtrl', function($scope) {
    });

//'should annotate refs that have been chained'
var mod = angular.module('chain', []);
mod.factory('a',function($scope) {
}).
    factory('b', function($scope) {
    });

//'should annotate refs to chains'
var mod = angular.module('chain', []).
    factory('a', function($scope) {
    });
mod.factory('b', function($scope) {
});


// directive.js
//'should annotate directive controllers'
angular.module('myMod', []).
    directive('myDir', function() {
        return {
            controller: function($scope) {
                $scope.test = true;
            }
        };
    });

//'should annotate directive controllers of annotated directives'
angular.module('myMod', []).
    directive('myDir', function($window) {
        return {
            controller: function($scope) {
                $scope.test = true;
            }
        };
    });


// loader.js
//'should annotate modules inside of loaders'
define(["./thing"], function(thing) {
    angular.module('myMod', []).
        controller('MyCtrl', function($scope) {
        });
});

//'should annotate module refs inside of loaders'
define(["./thing"], function(thing) {
    var myMod = angular.module('myMod', []);
    myMod.controller('MyCtrl', function($scope) {
    });
    return myMod;
});


// reference.js
//'should annotate declarations on referenced modules'
var myMod = angular.module('myMod', []);
myMod.controller('MyCtrl', function($scope) {
});

//'should annotate declarations on referenced modules when reference is declared then initialized'
var myMod;
myMod = angular.module('myMod', []);
myMod.controller('MyCtrl', function($scope) {
});

//'should annotate object-defined providers on referenced modules'
var myMod;
myMod = angular.module('myMod', []);
myMod.provider('MyService', { $get: function(service) {
} });

//'should annotate declarations on referenced modules ad infinitum'
var myMod = angular.module('myMod', []);
var myMod2 = myMod, myMod3;
myMod3 = myMod2;
myMod3.controller('MyCtrl', function($scope) {
});

//'should not annotate declarations on non-module objects'
var myMod, myOtherMod;
myMod = angular.module('myMod', []);
myOtherMod.controller('MyCtrl', function($scope) {
});

//'should keep comments', function() {
var myMod = angular.module('myMod', []);
/*! license */
myMod.controller('MyCtrl', function($scope) {
});


// route-provider.js
//'should annotate $routeProvider.when()'
angular.module('myMod', []).
    config(function($routeProvider) {
        $routeProvider.when('path', {
            controller: function($scope) {
                $scope.works = true;
            }
        });
    });

//'should annotate chained $routeProvider.when()'
angular.module('myMod', []).
    config(function($routeProvider) {
        $routeProvider.
            when('path', {
                controller: function($scope) {
                    $scope.works = true;
                }
            }).
            when('other/path', {
                controller: function($http) {
                    $http.get();
                }
            });
    });


// simple.js
//'should annotate controllers'
angular.module('myMod', []).
    controller('MyCtrl', function($scope) {
        $scope.foo = 'bar';
    });

//'should annotate directives'
angular.module('myMod', []).
    directive('myDirective', function($rootScope) {
        return {
            restrict: 'E',
            template: 'sup'
        };
    });

//'should annotate filters'
angular.module('myMod', []).
    filter('myFilter', function(dep) {
    });

//'should annotate services'
angular.module('myMod', []).
    service('myService', function(dep) {
    });

//'should annotate factories'
angular.module('myMod', []).
    controller('factory', function(dep) {
    });

//'should annotate decorators'
//(no it should actually not)
angular.module('myMod', []).
    decorator('myService', function(dep) {
    });

//'should annotate config'
angular.module('myMod', []).
    config(function(dep) {
    });

//'should annotate run'
angular.module('myMod', []).
    run(function(dep) {
    });

//'should annotate providers defined by functions'
angular.module('myMod', []).
    provider('myService', function(dep) {
        this.$get = function(otherDep) {
        };
    });

//'should annotate providers defined by objects'
angular.module('myMod', []).
    provider('myService', {
        $get: function(otherDep) {
        }
    })

//'should annotate declarations on modules being referenced'
angular.module('myMod', []);
angular.module('myMod').
    provider('myService', function(dep) {
    });

//'should not annotate declarations with no dependencies'
angular.module('myMod', []).
    provider('myService', function() {
    });

//'should not annotate constants'
angular.module('myMod', []).constant('fortyTwo', 42);

//'should not annotate values'
angular.module('myMod', []).value('fortyTwo', 42);
