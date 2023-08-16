let express = require("express");
let sqlite3 = require("sqlite3");
let path = require("path");
let { open } = require("sqlite");
let dbPath = path.join(__dirname, "twitterClone.db");
let jwt = require("jsonwebtoken");
let app = express();

app.use(express.json());
let db = null;
let initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//register
app.post("/register/", async (request, response) => {
  let requestBody = request.body;
  let { username, password, name, gender } = requestBody;
  let checkQuery = `select * from user where username = '${username}';`;
  let finder = await db.get(checkQuery);
  if (finder === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      let checkInQuery = `insert into user(username, password, name, gender) values('${username}', '${password}', '${name}', '${gender}');`;
      let insert = await db.run(checkInQuery);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
let authenticate = async (request, response, next) => {
  let jwtToken;
  let authHeader = request.headers["authorization"];
  console.log(authHeader);
  if (authenticate !== undefined) {
    jwToken = authHeader.split(" ")[1];
  }
  if (jwToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwToken, "The_Secret", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        request.id = payload.user_id;
        //console.log(payload);
        //console.log(request.username);
        //console.log(request.id);
        next();
      }
    });
  }
};
//login
app.post("/login/", async (request, response) => {
  let requestBody = request.body;
  let { username, password } = requestBody;
  let checkQuery = `select * from user where username = '${username}';`;
  let finder = await db.get(checkQuery);
  if (finder !== undefined) {
    if (finder.password !== password) {
      response.status(400);
      response.send("Invalid password");
    } else {
      let jwToken = await jwt.sign(finder, "The_Secret");

      response.send({ jwToken });
      console.log(jwToken);
    }
  } else {
    response.status(400);
    response.send("Invalid user");
  }
});
app.get("/user/tweets/feed/", authenticate, async (request, response) => {
  let { username, id } = request;
  console.log(username, id);
  let feedSql = `select user.username as username,
  tweet.tweet as tweet,
  tweet.date_time as dateTime 
  from follower left join tweet on follower.following_user_id = tweet.user_id left join user on user.user_id = tweet.user_id
  WHERE follower_user_id = ${id}
  order by dateTime DESC
  limit 4;`;
  let feedList = await db.all(feedSql);
  console.log(feedList);
  response.send(feedList);
});

app.get("/user/following/", authenticate, async (request, response) => {
  let { username, id } = request;
  console.log(username, id);
  let feedSql = `select user.username as name 
  from user left join follower on follower.following_user_id = user.user_id
  WHERE follower_user_id = ${id};`;
  let feedList = await db.all(feedSql);
  console.log(feedList);
  response.send(feedList);
});

app.get("/user/followers/", authenticate, async (request, response) => {
  let { username, id } = request;
  console.log(username, id);
  let feedSql = `select user.username as name 
  from follower left join user on follower.follower_user_id = user.user_id
  WHERE following_user_id = ${id};`;
  let feedList = await db.all(feedSql);
  console.log(feedList);
  response.send(feedList);
});

app.get("/tweets/:tweetId/", authenticate, async (request, response) => {
  let requestParams = request.params;
  let { tweetId } = requestParams;
  let tweets = `select tweet.tweet,count(like.like_id) as likes,count(reply.reply) as replies,tweet.date_time as dateTime from tweet left join like on like.tweet_id=tweet.tweet_id left join reply on like.tweet_id=reply.tweet_id
    where tweet.tweet_id =${tweetId}`;
  let tweetsList = await db.get(tweets);
  //console.log(tweetsList.tweet);
  if (tweetsList.tweet === null) {
    response.status = 401;
    response.send("Invalid Request");
  } else {
    response.send(tweetsList);
  }
});

app.get("/tweets/:tweetId/likes/", authenticate, async (request, response) => {
  let requestParams = request.params;
  let { username, id } = request;
  let { tweetId } = requestParams;
  console.log(tweetId);
  let tweets = `select username
  from user left join tweet on user.user_id=tweet.user_id
  left join like on tweet.tweet_id = like.tweet_id
  where tweet.tweet_id = ${tweetId} and
  like.user_id = (select follower.following_user_id from follower where 
  follower.follower_user_id = ${id}
  );`;
  let tweetsList = await db.all(tweets);
  //console.log(tweetsList.tweet);
  if (tweetsList.length === 0) {
    response.status = 401;
    response.send("Invalid Request");
  } else {
    let tweeterList = [];
    for (let item of tweetsList) {
      tweeterList.push(item.username);
    }
    response.send({ likes: tweeterList });
  }
});

app.get(
  "/tweets/:tweetId/replies/",
  authenticate,
  async (request, response) => {
    let requestParams = request.params;
    let { username, id } = request;
    let { tweetId } = requestParams;
    console.log(tweetId);
    let tweets = `select username as name,reply
  from user left join tweet on user.user_id=tweet.user_id
  left join reply on tweet.tweet_id = reply.tweet_id
  where tweet.tweet_id = ${tweetId} and
  reply.user_id = (select follower.following_user_id from follower where 
  follower.follower_user_id = ${id}
  );`;
    let tweetsList = await db.all(tweets);
    //console.log(tweetsList.tweet);
    if (tweetsList.length === 0) {
      response.status = 401;
      response.send("Invalid Request");
    } else {
      let tweeterList = [];
      for (let item of tweetsList) {
        tweeterList.push(item);
      }
      response.send({ replies: tweeterList });
    }
  }
);

app.get("/user/tweets/", authenticate, async (request, response) => {
  let requestParams = request.params;
  let { username, id } = request;
  console.log(id);
  let tweets = `select tweet,tweet.tweet_id,count(like.tweet_id)as likes,count(reply.tweet_id) as replies, tweet.date_time as dateTime
  from user left join tweet on user.user_id=tweet.user_id
  left join like on like.tweet_id=tweet.tweet_id
  left join reply on reply.tweet_id=tweet.tweet_id
  where tweet.user_id = ${id};`;
  let tweetsList = await db.all(tweets);
  //console.log(tweetsList.tweet);
  if (tweetsList.length === 0) {
    response.status = 401;
    response.send("Invalid Request");
  } else {
    let tweeterList = [];
    for (let item of tweetsList) {
      tweeterList.push(item);
    }
    response.send(tweeterList);
  }
});
app.post("/user/tweets/", authenticate, async (request, response) => {
  let requestParams = request.params;
  let { username, id } = request;
  let requestBody = request.body;
  let { tweet } = requestBody;
  let dateTime = new Date();
  console.log(id);
  let tweets = `insert into 
  tweet(tweet,user_id,date_time) 
  values('${tweet}','${id}','${dateTime}');`;
  console.log(tweets);
  let tweetsList = await db.run(tweets);
  console.log(tweetsList);
  response.send("Created a Tweet");
});

app.post("/tweets/:tweetId/", authenticate, async (request, response) => {
  let requestParams = request.params;
  let { username, id } = request;
  let requestBody = request.params;
  let { tweetId } = requestBody;
  let tweets = `delete from tweet 
  where tweet_id = ${tweetId};`;
  let tweetsList = await db.run(tweets);
  tweets = `select * from tweet 
  where tweet_id = ${tweetId};`;
  let tweetItem = await db.all(tweets);
  if (tweetItem.length === 1) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    response.send("Tweet Removed");
  }
  //console.log(tweetsList.tweet);
});

module.exports = app;
