import { getEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { ebayPattern, amazonPattern } from './patterns';

/**
 * Initialize the popup.
 */
$(function () {
    getEasyBlockStorageObject().then((easyBlockStorageObject: EasyBlockStorageObject) => {
        if (ebayPattern.base.test(easyBlockStorageObject.webpage)) {
            import('./popup-ebay').then(module => {
                module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                module.populatePopup();
                module.initializeHideAndUnhideButtons(easyBlockStorageObject.ebay);
            }).catch(err => {
                console.error('Failed to load eBay specific code', err);
            });
        } else if (amazonPattern.base.test(easyBlockStorageObject.webpage)) {
            import('./popup-amazon').then(module => {
                module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                module.populatePopup();
                module.initializeHideAndUnhideButtons(easyBlockStorageObject.amazon);
            })
        }
    }).catch(err => {
        console.error('Failed to retrieve easyBlockStorageObject from storage', err);
    });
});
