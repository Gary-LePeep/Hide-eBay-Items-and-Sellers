export interface EbayObject {
    sellers: string[];
    items: string[];
    hideSponsored: boolean;
    hideSellersFewerThanReviews: number;
    hideSellersLowerThanReviews: number;
    base_url: string;
    disabled: boolean;
}
export interface AmazonObject {
    items: string[];
    base_url: string;
    disabled: boolean;
}

export interface EasyBlockStorageObject {
    webpage: string;
    ebay: EbayObject;
    amazon: AmazonObject;
}


/**
 * Deep merges two objects.
 *
 * @param target - The target object to merge into (the default object)
 * @param source - The source object to merge from (the data object)
 * @returns The merged object
 */
function deepMerge(target: any, source: any) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], deepMerge(target[key], source[key]));
        }
    }
    return { ...target, ...source };
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
                    base_url: "",
                    disabled: false
                },
                amazon: {
                    items: [],
                    base_url: "",
                    disabled: false
                }
            };

            // Deep merge stored object with defaults to ensure that missing fields are filled in
            const easyBlockStorageObject = deepMerge(defaultStorageObject, result.easyBlockStorageObject || {});

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
