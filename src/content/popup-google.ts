import {getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject, GoogleObject} from './storage';

/**
 * Populate the "for website" header in the popup.
 * @param {string} websiteUrl The URL of the current website.
 */
export function populateWebsiteHeader(websiteUrl: string): void {
    if (websiteUrl) {
        const websiteName = websiteUrl.replace("https://", "").replace("www.", "");
        $("#forWebsite").text(`for ${websiteName}`);
    }
}

/**
 * Populate the popup with the stored data.
 *
 * The function retrieves the stored data from the storage module and populates the popup with the following data:
 * - The list of hidden sellers.
 * - The list of hidden items.
 */
export async function populatePopup() {
    const easyBlockStorageObject = await getEasyBlockStorageObject();
    const { sellers, whitelist, items, base_url, disabled } = easyBlockStorageObject.google;

    if (sellers.length > 0) {
        $(".seller-list-group .default-list-item").remove();
        sellers.forEach(addListItem.bind(null, easyBlockStorageObject, ".seller-list-group"));
    }

    if (items.length > 0) {
        $(".item-list-group .default-list-item").remove();
        items.forEach(addListItem.bind(null, easyBlockStorageObject, ".item-list-group"));
    }
}


/**
 * Initializes the hide and unhide buttons in the popup.
 * @param {EasyBlockStorageObject['google']} googleObject The object containing the lists of hidden sellers and items.
 */
export function initializeHideAndUnhideButtons(googleObject: EasyBlockStorageObject['google']): void {
    $(".list-group").on("click", ".remove-button", async function () {
        const listGroup = $(this).closest("ul");
        const listItem = $(this).parent().get(0);
        const removedValue = $(listItem).find("a").first().text();

        if (listGroup.hasClass("seller-list-group")) {
            googleObject.sellers = googleObject.sellers.filter((value) => value !== removedValue);
        } else {
            googleObject.items = googleObject.items.filter((value) => value !== removedValue);
        }

        // Update and save the updated googleObject
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.google.sellers = googleObject.sellers;
            easyBlockStorageObject.google.items = googleObject.items;
            await setEasyBlockStorageObject(easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }

        $(listItem).remove();

        const listCount = listGroup.children().length;
        if (listCount === 0) {
            const message = listGroup.hasClass("seller-list-group") ? "No sellers hidden..." : "No items hidden...";
            listGroup.html('<li class="list-group-item align-items-center default-list-item">' + message + "</li>");
        }
    });

    $(".hide-button").on("click", async function () {
        const inputGroup = $(this).closest(".input-group");
        const input = inputGroup.children("input").first();
        const value = input?.val()?.toLowerCase().trim();

        const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        if (input.hasClass("userid-input")) {
            if (isValidUserID(easyBlockStorageObject.google, inputGroup, value)) {
                completeListUpdate(easyBlockStorageObject.google, ".seller-list-group", value);
                input.val("");
            }
        } else {
            if (isValidItemNumber(easyBlockStorageObject.google, inputGroup, value)) {
                completeListUpdate(easyBlockStorageObject.google, ".item-list-group", value);
                input.val("");
            }
        }
        await setEasyBlockStorageObject(easyBlockStorageObject);
    });
}

/**
 * Checks if a given string is a valid google seller.
 *
 * Returns true.
 * @param {GoogleObject} googleObject The object containing the google data.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} userID The text entered by the user.
 * @return {boolean} True.
 */
function isValidUserID(googleObject: GoogleObject, inputGroup, userID) {
    const input = $("input", inputGroup);
    const feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();

    input.removeClass("is-invalid");
    feedbackDiv.removeClass("d-block");
    return true;
}


/**
 * Checks if a given string is a valid google item number.
 *
 * Returns true.
 * @param {GoogleObject} googleObject The object containing the google data.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} itemNumber The text entered by the user.
 * @return {boolean} True.
 */
function isValidItemNumber(googleObject: GoogleObject, inputGroup, itemNumber) {
    const input = $("input", inputGroup);
    const feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();

    input.removeClass("is-invalid");
    feedbackDiv.removeClass("d-block");
    return true;
}


/**
 * Completes the process of adding a new item to the list.
 *
 * If the list was empty, this function removes the default list item.
 * It then adds the new item to the list, and scrolls to the bottom of the list.
 * Finally, it updates the list stored in local storage.
 * @param {GoogleObject} googleObject The object containing the google data.
 * @param {object} listGroup The list group containing the new item.
 * @param {string} value The text of the new item.
 */
async function completeListUpdate(googleObject: GoogleObject, listGroup, value) {
    if ($(listGroup).children().length === 1) {
        let listItem = $(listGroup).children().first();
        if ($(listItem).hasClass("default-list-item")) {
            $(listItem).remove();
        }
    }
    addListItem(googleObject, listGroup, value);
    let bottom = $("li:last-child", listGroup)?.offset()?.top ?? 0;
    $("li:last-child", listGroup).scrollTop(bottom);
    if ($(listGroup).hasClass("seller-list-group")) {
        googleObject.sellers.push(value);
    } else {
        googleObject.items.push(value);
    }
    try {
        const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        easyBlockStorageObject.google.sellers = googleObject.sellers;
        easyBlockStorageObject.google.items = googleObject.items;
        await setEasyBlockStorageObject(easyBlockStorageObject);
    } catch (error) {
        console.error('Failed to update and save easyBlockStorageObject:', error);
    }
}

/**
 * Adds a new list item to the list group specified by the selector.
 * The value parameter is the text of the new item.
 * @param {GoogleObject} googleObject The object containing the google data.
 * @param {string} listGroupSelector The selector of the list group to add the item to.
 * @param {string} value The text of the new item.
 */
function addListItem(googleObject: GoogleObject, listGroupSelector, value) {
    const listGroup = $(listGroupSelector);
    const href = googleObject.base_url === "" ? "https://google.com" : googleObject.base_url;
    const linkHref = listGroup.hasClass("seller-list-group") ? href + "/usr/" + value : href + "/itm/" + value;
    const listItem =
        `<li class="list-group-item d-flex justify-content-between align-items-center">
            <div class="link-container">
                <a class="list-item-link text-danger" target="_blank" href="${linkHref}">${value}</a>
            </div>
            <button type="button" name="remove" class="btn btn-outline-danger py-0 remove-button">x</button>
        </li>`;

    listGroup.append(listItem);
}
