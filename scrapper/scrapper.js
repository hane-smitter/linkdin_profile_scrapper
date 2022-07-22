const fs = require("fs/promises");
const cheerio = require("cheerio");
const path = require("path");

const projectRoot = path.join(__dirname, "../");
console.log({ projectRoot });
// const isLinkedinUrl =
//   /^https:\/\/(\w+\.)?linkedin.com\/in\/[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)?\/?$/g;
const isLinkedinPublicUrl =
  /^https:\/\/(\w{2})\.linkedin.com\/in\/[a-zA-Z0-9-]+(\/[a-zA-Z0-9-]+)?\/?$/g;
let nextPageUrl;
let linkdinProfileURLs = [];
let browserPage;
let profileData = [];

/**
 *
 * @param {object} browser - Browser Instance
 * @param {string} searchUrl - Url to search
 * @param {number} [resultsLength=10] - Number of results to fetch
 */
async function init(browser, searchUrl, resultsLength = 10) {
  browserPage = await browser.newPage();
  await getLinkedinProfileUrls(searchUrl);
  await getLinkedinProfileData();
}

/**
 *
 * @param {object} browser - Browser Instance
 * @param {string} searchUrl - Url to search
 */
async function getLinkedinProfileUrls(searchUrl) {
  try {
    console.log(`Searching %s ...`, searchUrl);
    await browserPage.goto(searchUrl, { waitUntil: "domcontentloaded" });

    // Wait for the selector to appear within DOM
    await browserPage.waitForSelector("#center_col");
    const html = await browserPage.evaluate(() => {
      // container containing search results and naviagation presentation
      const searchResultsMain = document.getElementById("center_col").innerHTML;
      return searchResultsMain;
    });

    await fs.writeFile(`${projectRoot}searchresults.html`, html, (err) => {
      if (err) {
        return console.error(err);
      }
      // file written successfully
      console.log("file written successfully");
    });

    // Traverse the HTML sring
    const $ = cheerio.load(html, null, false);
    const extractLinkdinUrls = $(
      "div#search div div div.g div div div > a"
    ).each((i, elem) => {
      const href = elem.attribs?.href;
      //   console.log(`-- ${href} --`)

      if (href && href.indexOf("linkedin.com") > -1) {
        // match linkedin URLs
        const frmLinkedin = isLinkedinPublicUrl.test(href);
        // console.log("%d %s -> %s", i, href, frmLinkedin);

        if (frmLinkedin) {
          linkdinProfileURLs.push(href);
        }
      }
    });

    // We pick the URL of the next browserPage, since active browserPage is `td` that has a class attribute on it
    // and without an aria-level attribute and not a first-child
    // The next browserPage is the sibling next to this `td` identified
    const extractnxtPgLink = $(
      "div[role='navigation'] table[role='presentation'] tbody tr td[class]:not([aria-level]):not(:first-of-type)"
    )
      .next()
      .children()[0];
    nextPageUrl = $(extractnxtPgLink).attr("href");
    console.log({ nextPageUrl });

    console.log(linkdinProfileURLs);
    // return { nextPageUrl, linkdinProfileURLs };
    // browserPage.close();
  } catch (error) {
    throw new Error(error);
    // console.log(error.stack);
  }
}

function waitUntil(t) {
  return new Promise((r) => {
    setTimeout(r, t);
  });
}

/**
 * Get linkedin profile information
 */
async function getLinkedinProfileData() {
  try {
    for (let i = 0; i < linkdinProfileURLs.length; i++) {
      await waitUntil(3000);
      const link = linkdinProfileURLs[i];
      await browserPage.goto(link, { waitUntil: "domcontentloaded" });
      await browserPage.waitForSelector("#main-content");
      const html = await browserPage.evaluate(() => {
        // Traverse DOM
        // Container containing profile info
        const searchResultsMain =
          document.querySelector(".core-rail").innerHTML;
        // console.log("searchResultsMain ", searchResultsMain);
        return searchResultsMain;
      });

      await fs.writeFile(`${projectRoot}profileresults.html`, html, (err) => {
        if (err) {
          return console.error(err);
        }
        // file written successfully
        console.log("profile results  written successfully");
      });

      // Traverse the HTML sring
      const $ = cheerio.load(html, null, false);

      const profileContainer = $(".profile");
      const profileCard = $(profileContainer).find(
        ".top-card-layout .top-card-layout__card"
      );

      const extractProfileImg = $(profileCard)
        .find(".top-card__profile-image-container img")
        .attr("data-ghost-url");

      const extractProfileName = $(profileCard)
        .find(
          ".top-card-layout__entity-info-container .top-card-layout__entity-info:first-child .top-card-layout__title"
        )
        .text();

      const extractProfileHeadline = $(profileCard)
        .find(
          ".top-card-layout__entity-info-container .top-card-layout__entity-info:first-child .top-card-layout__headline"
        )
        .text();

      const extractAboutHtml = $(profileContainer)
        .find(".core-section-container .core-section-container__content")
        .children()[0];
      const extractAbout = $(extractAboutHtml).text();

      let profile = {
        profileImage: extractProfileImg,
        name: String(extractProfileName).replace(/(\r\n|\n|\r)/gm, "").trim(),
        title: String(extractProfileHeadline).replace(/(\r\n|\n|\r)/gm, "").trim(),
        about: String(extractAbout).replace(/(\r\n|\n|\r)/gm, "").trim(),
      };
      profileData.push(profile);
    }
    console.log("Retrieved Profiles ", profileData);
    console.log("Retrieved Profiles Total:: ", profileData.length);
  } catch (error) {
    console.log(error.message);
  }
}

module.exports = init;
