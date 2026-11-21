const { MongoClient } = require("mongodb");
const config = require("./config");

let client = null;
let database = null;

async function connect() {
  client = new MongoClient(config.mongoUrl, {
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  database = client.db();
}

function getDb() {
  if (!database) {
    throw new Error("mongo connection is not ready");
  }
  return database;
}

module.exports = { connect, getDb };