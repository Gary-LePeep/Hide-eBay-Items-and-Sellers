import { getEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { ebayPattern } from './patterns';

/**
 * Initialize the popup.
 */
$(function () {
    getEasyBlockStorageObject().then((easyBlockStorageObject: EasyBlockStorageObject) => {
        if (ebayPattern.base.test(easyBlockStorageObject.webpage)) {
            // Dynamically import the eBay-specific module
            import('./popup-ebay').then(module => {
                module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                module.populatePopup();
                module.initializeHideAndUnhideButtons(easyBlockStorageObject.ebay);
            }).catch(err => {
                console.error('Failed to load eBay specific code', err);
            });
        }
    }).catch(err => {
        console.error('Failed to retrieve easyBlockStorageObject from storage', err);
    });
});
