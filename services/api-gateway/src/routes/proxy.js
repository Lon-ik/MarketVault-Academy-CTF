const { createProxyMiddleware } = require("http-proxy-middleware");

function proxy(target, name, prefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: false,
    xfwd: false,
    pathRewrite: prefix ? (path) => prefix + path : undefined,
    on: {
      error: (error, req, res) => {
        if (res && !res.headersSent) {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `${name} unavailable` }));
        }
      },
    },
  });
}

module.exports = { proxy };