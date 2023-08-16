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
let authenticate = (request, response, next) => {
  let jwtToken;
  let authHeader = request.headers[authorization];
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

module.exports = app;
