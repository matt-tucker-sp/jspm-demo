/*@ngInject*/
var AnotherThingCtrl = function(commonService) {
    this.getTheLocale = function() {
        return commonService.getLocaleId();
    }
};

module.exports = AnotherThingCtrl;