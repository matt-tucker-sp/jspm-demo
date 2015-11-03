/*@ngInject*/
var CommonService = function($locale) {
    return {
        getLocaleId: function() {
            return $locale.id;
        },
        
        getDate: function() {
            return new Date();
        }
    };
};

module.exports = CommonService;