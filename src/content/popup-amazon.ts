import { getEasyBlockStorageObject, setEasyBlockStorageObject, EasyBlockStorageObject } from './storage';

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
 * - The hide sponsored setting.
 * - The hide sellers with fewer than X reviews setting.
 * - The hide sellers with a lower than X% reviews setting.
 *
 * The function also sets up event listeners for the following elements:
 * - The hide sponsored checkbox. When the checkbox is changed, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The hide sellers with fewer than X reviews input. When the input is changed and the button is clicked, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The hide sellers with a lower than X% reviews input. When the input is changed and the button is clicked, the function updates the stored data and shows the "Refresh to Apply" button.
 * - The "Refresh to Apply" button. When the button is clicked, the function reloads the current tab.
 */
export async function populatePopup() {
    const easyBlockStorageObject = await getEasyBlockStorageObject();
    const { items } = easyBlockStorageObject.amazon;

    if (items.length > 0) {
        $(".item-list-group .default-list-item").remove();
        items.forEach(addListItem.bind(null, easyBlockStorageObject, ".item-list-group"));
    }
}


/**
 * Initializes the hide and unhide buttons in the popup.
 * @param {EasyBlockStorageObject['amazon']} amazonObject The object containing the lists of hidden sellers and items.
 */
export function initializeHideAndUnhideButtons(amazonObject: EasyBlockStorageObject['amazon']): void {
    $(".list-group").on("click", ".remove-button", async function () {
        const listGroup = $(this).closest("ul");
        const listItem = $(this).parent().get(0);
        const removedValue = $(listItem).find("a").first().text();

        amazonObject.items = amazonObject.items.filter((value) => value !== removedValue);

        // Update and save the updated amazonObject
        try {
            const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
            easyBlockStorageObject.amazon.items = amazonObject.items;
            await setEasyBlockStorageObject(easyBlockStorageObject);
        } catch (error) {
            console.error('Failed to update and save easyBlockStorageObject:', error);
        }

        $(listItem).remove();

        const listCount = listGroup.children().length;
        if (listCount === 0) {
            const message = "No items hidden...";
            listGroup.html('<li class="list-group-item align-items-center default-list-item">' + message + "</li>");
        }
    });

    $(".hide-button").on("click", async function () {
        const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        const inputGroup = $(this).closest(".input-group");
        const input = inputGroup.children("input").first();
        const value = input?.val()?.toLowerCase().trim();

        if (isValidASIN(easyBlockStorageObject.amazon, inputGroup, value)) {
            completeListUpdate(easyBlockStorageObject.amazon, ".item-list-group", value);
            input.val("");
        }
        await setEasyBlockStorageObject(easyBlockStorageObject);
    });
}

/**
 * Checks if a given string is a valid ASIN.
 *
 * Returns false if the input is invalid or already exists in the list.
 * Returns true if the input is valid.
 * @param {object} amazonObject The object containing the list of hidden items and sellers.
 * @param {object} inputGroup The input group containing the text input field.
 * @param {string} itemNumber The text entered by the user.
 * @return {boolean} False if the input is invalid, true otherwise.
 */
function isValidASIN(amazonObject, inputGroup, itemNumber) {
    const input = $("input", inputGroup);
    const feedbackDiv = $(inputGroup).siblings(".invalid-feedback").first();

    if (itemNumber.length !== 10) {
        input.addClass("is-invalid");
        feedbackDiv.addClass("d-block").text("Please provide a valid ASIN.");
        return false;
    } else if (amazonObject.items.includes(itemNumber)) {
        input.addClass("is-invalid");
        feedbackDiv.addClass("d-block").text("You have already added this ASIN to the list.");
        return false;
    }

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
 * @param {object} listGroup The list group containing the new item.
 * @param {string} value The text of the new item.
 */
async function completeListUpdate(amazonObject, listGroup, value) {
    if ($(listGroup).children().length === 1) {
        let listItem = $(listGroup).children().first();
        if ($(listItem).hasClass("default-list-item")) {
            $(listItem).remove();
        }
    }
    addListItem(amazonObject, listGroup, value);
    let bottom = $("li:last-child", listGroup)?.offset()?.top ?? 0;
    $("li:last-child", listGroup).scrollTop(bottom);
    amazonObject.items.push(value);
    try {
        const easyBlockStorageObject: EasyBlockStorageObject = await getEasyBlockStorageObject();
        easyBlockStorageObject.amazon.items = amazonObject.items;
        await setEasyBlockStorageObject(easyBlockStorageObject);
    } catch (error) {
        console.error('Failed to update and save easyBlockStorageObject:', error);
    }
}

/**
 * Adds a new list item to the list group specified by the selector.
 * The value parameter is the text of the new item.
 * @param {object} amazonObject The amazon object containing the base_url.
 * @param {string} listGroupSelector The selector of the list group to add the item to.
 * @param {string} value The text of the new item.
 */
function addListItem(amazonObject, listGroupSelector, value) {
    const listGroup = $(listGroupSelector);
    const href = amazonObject.base_url === "" ? "https://amazon.com" : amazonObject.base_url;
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
