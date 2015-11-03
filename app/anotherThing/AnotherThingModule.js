var angular = require('angular'),
    CommonModule = require('../common/CommonModule'),
    AnotherThingCtrl =  require('./AnotherThingCtrl'),
    AnotherThingModule = angular.module('AnotherThingModule', [
            CommonModule.name
        ]).
        controller('AnotherThingCtrl', AnotherThingCtrl);

module.exports = AnotherThingModule;