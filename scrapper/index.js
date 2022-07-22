const { startBrowser } = require("../browser.js");
const scrapper = require("./scrapper.js");

/**
 * Get profile info  from linkedin public profiles
 * @param {Object} searchValue - object with region and title to search
 * @param {string} searchValue.region - region to search
 * @param {string} searchValue.title - title to search
 */
async function linkedinScrapper(searchValue = { region: "", title: "" }) {
  const { region, title } = searchValue;
  const baseUrl = "https://www.google.com";
  const searchEndPoint = "/search?q=";
  const searchQuery = encodeURIComponent(
    `site:linkedin.com/in/ AND ${region} AND ${title}`
  );
  const searchUrl = baseUrl + searchEndPoint + searchQuery;

  try {
    const browserReady = await startBrowser();
    scrapper(browserReady, searchUrl);
  } catch (error) {
    console.log(error.message);
    console.log(error.stack);
    console.log("There is also a good chance you've hit an Authwall")
  }
}

module.exports = linkedinScrapper;
