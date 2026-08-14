import { getEasyBlockStorageObject, setEasyBlockStorageObject } from './storage';
import { processEbaySearchPage, processEbayItemPage, processEbayUserPage } from './content-ebay';
import { processAmazonSearchPage, processAmazonItemPage } from './content-amazon';
import { amazonPattern, ebayPattern } from './patterns';

// Initialize the script
processWebpage()

/**
 * Processes the webpage based on the current URL.
 */
function processWebpage() {
    getEasyBlockStorageObject().then((easyBlockStorageObject) => {
        easyBlockStorageObject.webpage = window.location.origin;
        setEasyBlockStorageObject(easyBlockStorageObject);

        if (ebayPattern.base.test(window.location.origin)) {
            easyBlockStorageObject.ebay.base_url = window.location.origin;
            if (easyBlockStorageObject.ebay.disabled) {
                return;
            }
            if (ebayPattern.searchPage.test(window.location.href)) {
                processEbaySearchPage();
            } else if (ebayPattern.itemPage.test(window.location.href)) {
                processEbayItemPage();
            } else if (ebayPattern.userPage.test(window.location.href)) {
                processEbayUserPage();
            }
        } else if (amazonPattern.base.test(window.location.origin)) {
            easyBlockStorageObject.amazon.base_url = window.location.origin;
            if (easyBlockStorageObject.amazon.disabled) {
                return;
            }
            if (amazonPattern.searchPage.test(window.location.href)) {
                processAmazonSearchPage();
            } else if (amazonPattern.itemPage.test(window.location.href)) {
                processAmazonItemPage();
            }
        }
    });
}

/**
 * Stops a click on one of our buttons from also reaching the page underneath.
 *
 * The buttons sit inside the sites' own clickable rows, so a click that is allowed to
 * bubble opens the seller card or the listing as well as hiding it. The buttons are
 * <input type="image">, which would additionally submit any enclosing form.
 *
 * This has to be called from the handlers rather than bound to the button itself: our own
 * handlers are delegated to ancestor elements, so suppressing the event at the button
 * would stop them from ever running.
 */
export function suppressPageClick(event: JQuery.ClickEvent) {
    event.preventDefault();
    event.stopPropagation();
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
        src: chrome.runtime.getURL("icon48.png")
    });
    const $container = contSelector instanceof HTMLElement ? $(contSelector) : contSelector;
    $container.append(input);
}
