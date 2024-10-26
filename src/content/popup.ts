import {getEasyBlockStorageObject, EasyBlockStorageObject, setEasyBlockStorageObject} from './storage';
import { ebayPattern, amazonPattern } from './patterns';

/**
 * Initialize the popup.
 */
$(function () {
    getEasyBlockStorageObject().then((easyBlockStorageObject: EasyBlockStorageObject) => {
        let websiteStorageObject = null;

        if (ebayPattern.base.test(easyBlockStorageObject.webpage)) {
            websiteStorageObject = easyBlockStorageObject.ebay;
            if (!websiteStorageObject.disabled) {
                import('./popup-ebay').then(module => {
                    module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                    module.populatePopup();
                    module.initializeHideAndUnhideButtons(easyBlockStorageObject.ebay);
                });
            }
        } else if (amazonPattern.base.test(easyBlockStorageObject.webpage)) {
            websiteStorageObject = easyBlockStorageObject.amazon;
            if (!websiteStorageObject.disabled) {
                import('./popup-amazon').then(module => {
                    module.populateWebsiteHeader(easyBlockStorageObject.webpage);
                    module.populatePopup();
                    module.initializeHideAndUnhideButtons(easyBlockStorageObject.amazon);
                });
            }
        }

        // Common
        if (websiteStorageObject) {
            $("#disableForSite").on("click", async () => {
                websiteStorageObject.disabled = true;
                await setEasyBlockStorageObject(easyBlockStorageObject);
                $("#refreshToApply").removeClass("d-none");
            });
            $("#reenableForSite").on("click", async () => {
                websiteStorageObject.disabled = false;
                await setEasyBlockStorageObject(easyBlockStorageObject);
                refresh()
            });
            $("#refreshToApply").on("click", () => {
                refresh()
            })
        }
    }).catch(err => {
        console.error('Failed to retrieve easyBlockStorageObject from storage', err);
    });
});

function refresh() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
        }
    });
}
