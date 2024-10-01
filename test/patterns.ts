import { EbayPattern } from "../src/content/patterns";

export const testEbayPattern = {
    base: "localhost:9001",
    searchPage: "localhost:9001/.+ebay.+(sch|b)",
    itemPage: "localhost:9001/.+ebay.+(itm|p)",
    userPage: "localhost:9001/.+ebay.+(usr|str)"
}
