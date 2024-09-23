import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage.js';

$(function () {
    /********************************************************
     *                   Browser Storage                    *
     *******************************************************/

    /**
     * Retrieves the storage object from the shared storage module.
     */
    getEasyBlockStorageObject().then((easyBlockStorageObject2: EasyBlockStorageObject) => {
        console.warn(JSON.stringify(easyBlockStorageObject2));

        // Check if the current page is eBay
        if (/^https:\/\/(.+?\.)?ebay\./.test(easyBlockStorageObject2.webpage)) {
            // Dynamically import the eBay-specific module
            import(chrome.runtime.getURL('src/content/popup-ebay.js')).then(module => {
                // Use the module's functions to populate the popup
                module.populateWebsiteHeader(easyBlockStorageObject2.webpage);
                module.populatePopup(easyBlockStorageObject2.ebay);
                module.initializeHideAndUnhideButtons(easyBlockStorageObject2.ebay);
            }).catch(err => {
                console.error('Failed to load eBay specific code', err);
            });
        }
    }).catch(err => {
        console.error('Failed to retrieve easyBlockStorageObject from storage', err);
    });
});
