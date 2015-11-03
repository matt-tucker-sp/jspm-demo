import angular from 'angular';
import commonModule from '../common/CommonModule';
import doSomethingCtrl from './doSomethingCtrl';

export default angular.module('doSomething', [commonModule.name]).
            controller('DoSomethingCtrl', doSomethingCtrl);