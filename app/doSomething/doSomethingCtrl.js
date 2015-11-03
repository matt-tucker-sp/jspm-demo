'use strict'

class DoSomethingCtrl {
    
    constructor(commonService) {
        'ngInject';
        this.commonService = commonService;
    }
    
    
   getThatThing() {
     return this.commonService.getDate();
   }
}

export default DoSomethingCtrl;