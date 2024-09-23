import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage.js';

/**
 * Initialize the popup.
 * 
 * This function retrieves the easyBlockStorageObject from the storage module and uses it to populate the popup.
 */
$(function () {
    getEasyBlockStorageObject().then((easyBlockStorageObject: EasyBlockStorageObject) => {
        if (/^https:\/\/(.+?\.)?ebay\./.test(easyBlockStorageObject.webpage)) {
            // Dynamically import the eBay-specific module
            import(chrome.runtime.getURL('src/content/popup-ebay.js')).then(module => {
                // Use the module's functions to populate the popup
                module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                module.populatePopup(easyBlockStorageObject.ebay);
                module.initializeHideAndUnhideButtons(easyBlockStorageObject.ebay);
            }).catch(err => {
                console.error('Failed to load eBay specific code', err);
            });
        }
    }).catch(err => {
        console.error('Failed to retrieve easyBlockStorageObject from storage', err);
    });
});
