import angular from 'angular';
import mainModule from './app/main';

angular.element(document).ready(function() {
    angular.bootstrap(document, [mainModule.name]);
});