var angular = require('angular'),
    anotherModule = angular.module('another', [
        require('./anotherThing/AnotherThingModule').name
    ]);

module.exports = anotherModule;