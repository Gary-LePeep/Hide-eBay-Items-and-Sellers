export interface EbayObject {
    sellers: string[];
    items: string[];
    hideSponsored: boolean;
    hideSellersFewerThanReviews: number;
    hideSellersLowerThanReviews: number;
    base_url: string;
}

export interface EasyBlockStorageObject {
    webpage: string;
    ebay: EbayObject;
}

// A function to get the full easyBlockStorageObject from chrome.storage
export function getEasyBlockStorageObject(): Promise<EasyBlockStorageObject> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['easyBlockStorageObject'], (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            // Provide a default structure if not found in storage
            resolve(result.easyBlockStorageObject || {
                webpage: "",
                ebay: {
                    sellers: [],
                    items: [],
                    hideSponsored: false,
                    hideSellersFewerThanReviews: 0,
                    hideSellersLowerThanReviews: 0,
                    base_url: ""
                }
            });
        });
    });
}

// A function to set the full easyBlockStorageObject into chrome.storage
export function setEasyBlockStorageObject(easyBlockStorageObject: EasyBlockStorageObject): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ easyBlockStorageObject }, () => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });
}