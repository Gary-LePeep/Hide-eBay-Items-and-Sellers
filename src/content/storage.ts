export interface EbayObject {
    sellers: string[];
    items: string[];
    hideSponsored: boolean;
    hideSellersFewerThanReviews: number;
    hideSellersLowerThanReviews: number;
    base_url: string;
}
export interface AmazonObject {
    items: string[];
    base_url: string;
}

export interface EasyBlockStorageObject {
    webpage: string;
    ebay: EbayObject;
    amazon: AmazonObject;
}

// A function to get the full easyBlockStorageObject from chrome.storage
export function getEasyBlockStorageObject(): Promise<EasyBlockStorageObject> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['easyBlockStorageObject'], (result) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            // Default structure
            const defaultStorageObject = {
                webpage: "",
                ebay: {
                    sellers: [],
                    items: [],
                    hideSponsored: false,
                    hideSellersFewerThanReviews: 0,
                    hideSellersLowerThanReviews: 0,
                    base_url: ""
                },
                amazon: {
                    items: [],
                    base_url: ""
                }
            };

            // Merge stored object with defaults to ensure that missing fields are filled in
            const easyBlockStorageObject = Object.assign({}, defaultStorageObject, result.easyBlockStorageObject);

            console.log("easyBlockStorageObject retrieved:", JSON.stringify(easyBlockStorageObject));
            resolve(easyBlockStorageObject);
        });
    });
}

// A function to set the full easyBlockStorageObject into chrome.storage
export function setEasyBlockStorageObject(easyBlockStorageObject: EasyBlockStorageObject): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({ easyBlockStorageObject }, () => {
            console.log("easyBlockStorageObject saved:", JSON.stringify(easyBlockStorageObject));
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve();
        });
    });
}
