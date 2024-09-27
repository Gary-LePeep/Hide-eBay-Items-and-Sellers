import { getEasyBlockStorageObject, setEasyBlockStorageObject } from './storage';
import { processSearchPage, processItemPage, processUserPage } from './content-ebay';

/**
 * Initializes the storage and processes the webpage.
 */
async function init() {
    try {
        const easyBlockStorageObject = await getEasyBlockStorageObject();
        console.warn('content.js retrieved easyBlockStorageObject', JSON.stringify(easyBlockStorageObject));
        processWebpage();
    } catch (error) {
        console.error('Failed to retrieve easyBlockStorageObject:', error);
    }
}

// Initialize the script
init();

/**
 * Processes the webpage based on the current URL.
 */
function processWebpage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        easyBlockStorageObject.webpage = window.location.origin;
        setEasyBlockStorageObject(easyBlockStorageObject);

        if (/^https:\/\/(.+?\.)?ebay\./.test(window.location.origin)) {
            easyBlockStorageObject.ebay.base_url = window.location.origin;

            if (/^https:\/\/(.+?\.)?ebay\..+?\/(sch|b)\/.+/.test(window.location.href)) {
                processSearchPage();
            } else if (/^https:\/\/(.+?\.)?ebay\..+?\/(itm|p)\/.+/.test(window.location.href)) {
                processItemPage();
            } else if (/^https:\/\/(.+?\.)?ebay\..+?\/(usr|str)\/.+/.test(window.location.href)) {
                processUserPage();
            }
        }
    });
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
