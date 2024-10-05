export const testEbayPattern = {
    base: "localhost:9001",
    searchPage: "localhost:9001/.+ebay.+(sch|b)",
    itemPage: "localhost:9001/.+ebay.+(itm|p)",
    userPage: "localhost:9001/.+ebay.+(usr|str)"
}

export const testAmazonPattern = {
    base: "localhost:9002",
    searchPage: "localhost:9002/.+amazon.+/s",
    itemPage: "localhost:9002/.+amazon.+/dp/"
}