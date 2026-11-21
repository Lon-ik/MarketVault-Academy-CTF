const express = require("express");
const { flagFor } = require("../flags");

const router = express.Router();

router.post("/parse", async (req, res) => {
  const imageUrl = req.body && req.body.imageUrl;
  if (!imageUrl || typeof imageUrl !== "string") {
    return res.status(400).json({ error: "imageUrl is required" });
  }
  try {
    const started = Date.now();
    const response = await fetch(imageUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();
    let hostname = "";
    try {
      hostname = new URL(imageUrl).hostname;
    } catch (error) {
      hostname = "";
    }
    let flag = null;
    if (
      hostname === "stats-service" ||
      body.includes("marketvault-stats") ||
      body.includes("SSRF_STATS_INTERNAL")
    ) {
      flag = await flagFor("ssrf-image-fetch", "MV{SSRF_STATS_INTERNAL}");
    }
    return res.json({
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      elapsedMs: Date.now() - started,
      size: Buffer.byteLength(body),
      preview: body.slice(0, 2000),
      flag,
    });
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }
});

module.exports = router;