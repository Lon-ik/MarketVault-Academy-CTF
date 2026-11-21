const { createClient } = require("redis");
const config = require("./config");

const client = createClient({ url: config.redisUrl });

client.on("error", (error) => {
  console.error("redis error:", error.message);
});

async function connect() {
  if (!client.isOpen) {
    await client.connect();
  }
}

module.exports = { client, connect };