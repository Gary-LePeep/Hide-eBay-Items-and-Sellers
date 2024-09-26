import { getEasyBlockStorageObject, EasyBlockStorageObject } from './storage';

/**
 * Initialize the popup.
 */
$(function () {
    getEasyBlockStorageObject().then((easyBlockStorageObject: EasyBlockStorageObject) => {
        if (/^https:\/\/(.+?\.)?ebay\./.test(easyBlockStorageObject.webpage)) {
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

document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ action: 'getLastMatchedKey' }, (response) => {
        const matchedKey = response.key;
        console.log(`Last matched key in popup: ${matchedKey}`);

        // Use matchedKey to determine what to display in the popup
        if (matchedKey === 'ebay') {
            // Populate ebay-specific content
        } else if (matchedKey === 'facebookMarketplace') {
            // Populate Facebook Marketplace-specific content
        } else {
            // Populate default content
        }
    });
});