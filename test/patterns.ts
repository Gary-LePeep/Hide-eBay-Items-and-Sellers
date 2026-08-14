/**
 * URL patterns matching the saved pages served from localhost during tests.
 *
 * The path segments are anchored with slashes to mirror the real patterns in
 * src/content/patterns.ts. Without them a page is routed by whatever letters happen to
 * appear in the saved file name -- a seller called "triplejequipment" contains a "p",
 * so an unanchored item pattern claims their user page.
 */
export const testEbayPattern = {
    base: "localhost:9001",
    searchPage: "localhost:9001/.+ebay.+/(sch|b)/",
    itemPage: "localhost:9001/.+ebay.+/(itm|p)/",
    userPage: "localhost:9001/.+ebay.+/(usr|str)/"
}

export const testAmazonPattern = {
    base: "localhost:9002",
    searchPage: "localhost:9002/.+amazon.+/s",
    itemPage: "localhost:9002/.+amazon.+/dp/"
}
