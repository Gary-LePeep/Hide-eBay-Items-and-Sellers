import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';
import { processSearchPage, processItemPage, processUserPage } from './content-ebay';

/********************************************************
 *                   Browser Storage                    *
 *******************************************************/

let easyBlockStorageObject: EasyBlockStorageObject;

/**
 * Initializes the storage object and processes the webpage.
 */
async function init() {
    try {
        easyBlockStorageObject = await getEasyBlockStorageObject();
        console.warn('content.js retrieved easyBlockStorageObject', JSON.stringify(easyBlockStorageObject));
        processWebpage();
    } catch (error) {
        console.error('Failed to retrieve easyBlockStorageObject:', error);
    }
}

/**
 * Saves the storage object to local storage.
 */
export async function updateStorageList() {
    try {
        await setEasyBlockStorageObject(easyBlockStorageObject);
    } catch (error) {
        console.error('Failed to update easyBlockStorageObject:', error);
    }
}

/**
 * Listens for changes to the storage object and updates it if a change is detected.
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        if (key === "easyBlockStorageObject") {
            easyBlockStorageObject = changes[key].newValue;
        }
    }
});

/********************************************************
 *                   Process Webpage                    *
 *******************************************************/

/**
 * Process Webpage
 *
 * This function checks the URL for one of the following subdirectories:
 * Ebay:
 *   `sch` or `b`: This is a search or category page.
 *   `itm` or `p`: This is a page for an item or category-item.
 *   `usr` or `str`: This is the page of a user.
 * Depending on which type of page it is, process that type of webpage.
 */
function processWebpage() {
    easyBlockStorageObject.webpage = window.location.origin;
    updateStorageList();

    if (/^https:\/\/(.+?\.)?ebay\./.test(window.location.origin)) {
        easyBlockStorageObject.ebay.base_url = window.location.origin;

        // Check the URL and call the appropriate function
        if (/^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+/.test(window.location.href)) {
            processSearchPage();
        } else if (/^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+/.test(window.location.href)) {
            processItemPage();
        } else if (/^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+/.test(window.location.href)) {
            processUserPage();
        }
    }
}

/**
 * Inserts a button into the page, at the specified container selector.
 * @param {number} size The size of the button, in pixels.
 * @param {string} title The title of the button.
 * @param {string} classList The class list of the button.
 * @param {JQuery<HTMLElement> | HTMLElement} contSelector The container selector where the button should be inserted.
 */
export function insertButton(size: number, title: string, classList: string, contSelector: JQuery<HTMLElement> | HTMLElement) {
    let input = $("<input/>", {
        class: classList,
        type: "image",
        width: size,
        height: size,
        title: title,
        alt: "Hide",
        src: chrome.runtime.getURL("icon48.png"),
    });
    const $container = contSelector instanceof HTMLElement ? $(contSelector) : contSelector;
    $container.append(input);
}

// Initialize the script
init();
