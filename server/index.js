const puppeteer = require("puppeteer");
const _ = require("lodash");
var bodyParser = require("body-parser");
let browser, page;
const cors = require("cors");

const express = require("express");
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors());
app.post("/", async (req, res) => {
  const users = req.body.users;
  const usersResponse = [];
  const hashtag = req.body.hashtag;
  const timeStamp = req.body.timeStamp;

  for (let index = 0; index < users.length; index++) {
    const user = users[index];
    console.log("user--", user);

    const userTemp = await getUserDetails(user, hashtag, timeStamp);
    userTemp.user_link = user;

    usersResponse.push(userTemp);
  }

  res.send(usersResponse);
});

async function getUserDetails(user, hashtag, timeStamp) {
  let userObject = {};
  await page.goto(`https://www.instagram.com/${user}/?__a=1`,  {waitUntil: 'load', timeout: 0});
  let data = await page.evaluate(
    () => document.querySelector("body > pre").innerHTML
  );
  data = JSON.parse(data);

  //   fill basic user details
  //userObject.biography = _.get(data, "graphql.user.biography");
  userObject.id = _.get(data, "graphql.user.id");
  userObject.edge_followed_by = _.get(
    data,
    "graphql.user.edge_followed_by.count"
  );
  userObject.edge_follow = _.get(data, "graphql.user.edge_follow.count");

  userObject.post = await findPost(
    _.get(data, "graphql.user.edge_owner_to_timeline_media"),
    hashtag
  );

  let end_cursor = _.get(
    data,
    "graphql.user.edge_owner_to_timeline_media.page_info.end_cursor"
  );

  let takenAtTimeStamp = await findTimeStamp(
    _.get(data, "graphql.user.edge_owner_to_timeline_media"));
  
  while (!userObject.post && end_cursor && takenAtTimeStamp>timeStamp) {
    await page.goto(
      `https://www.instagram.com/graphql/query/?query_hash=472f257a40c653c64c666ce877d59d2b&variables={%22id%22:%22${userObject.id}%22,%22first%22:12,%22after%22:%22${end_cursor}%22}`, {waitUntil: 'load', timeout: 0}
    );

    let data = await page.evaluate(
      () => document.querySelector("body > pre").innerHTML
    );
    data = JSON.parse(data);

    takenAtTimeStamp = await findTimeStamp(
      _.get(data, "data.user.edge_owner_to_timeline_media"));

    userObject.post = await findPost(
      _.get(data, "data.user.edge_owner_to_timeline_media"),
      hashtag
    );

    end_cursor = _.get(
      data,
      "data.user.edge_owner_to_timeline_media.page_info.end_cursor"
    );
  }

  userObject.post = _.get(userObject, "post.node", {});
  if (userObject.post?.shortcode) {
    userObject.post.display_url = `https://www.instagram.com/p/${userObject.post.shortcode}`;
  }
  userObject.post = _.pick(userObject.post, [
    "edge_media_preview_like",
    "edge_media_to_comment",
    "display_url",
  ]);

  if (Object.keys(userObject.post).length === 0) {
    console.log("null");
    userObject.edge_media_preview_like = null;
    userObject.edge_media_to_comment = null;
    userObject.display_url = null;
  } else {
    console.log("not null");
    userObject.edge_media_preview_like =
      userObject.post.edge_media_preview_like;
    userObject.edge_media_to_comment = userObject.post.edge_media_to_comment;
    userObject.display_url = userObject.post.display_url;
  }

  delete userObject["post"];
  return userObject;
}

async function findTimeStamp(edge_owner_to_timeline_media) {
  let timeStamp = edge_owner_to_timeline_media.edges[0].node.taken_at_timestamp;
  return timeStamp;
}

async function findPost(edge_owner_to_timeline_media, hashtag) {
  let post = edge_owner_to_timeline_media.edges.find((post) => {
    let captions = _.get(post, "node.edge_media_to_caption.edges", []);

    let foudCaption = captions.find((caption) => {
      if (_.get(caption, "node.text").indexOf(hashtag) > -1) {
        return true;
      }
      return false;
    });
    return foudCaption;
  });

  return post;
}

async function start() {
  browser = await puppeteer.launch({ headless: false });
  page = await browser.newPage();
  await page.goto("https://www.instagram.com/accounts/login/");
  await page.waitForSelector('input[name="username"]');
  await page.type('input[name="username"]', "username");
  await page.type('input[name="password"]', "password");
  await page.click('button[type="submit"]');
  // Add a wait for some selector on the home page to load to ensure the next step works correctly
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "example.png" });
  app.listen(port, async () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

start();
