const express = require("express");
const { graphql } = require("graphql");
const { schema, root } = require("../graphql");
const { flagFor } = require("../flags");

const router = express.Router();

async function executeOne(operation, context) {
  if (!operation || typeof operation.query !== "string") {
    return { errors: [{ message: "invalid GraphQL operation" }] };
  }
  return graphql({
    schema,
    source: operation.query,
    rootValue: root,
    contextValue: context,
    variableValues: operation.variables || {},
    operationName: operation.operationName || undefined,
  });
}

router.post("/", async (req, res) => {
  const context = { user: req.user, req };
  try {
    if (Array.isArray(req.body)) {
      const started = Date.now();
      const results = await Promise.all(
        req.body.map((operation) => executeOne(operation, context))
      );
      if (req.body.length >= 200) {
        const flag = await flagFor(
          "graphql-batching-dos",
          "MV{GRAPHQL_BATCHING_DOS}"
        );
        if (results[0] && typeof results[0] === "object") {
          results[0].extensions = {
            ...(results[0].extensions || {}),
            flag,
            batchSize: req.body.length,
            cost: req.body.length * 3,
          };
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(req.body.length * 5, 3000))
        );
      }
      return res.json({
        batch: true,
        elapsedMs: Date.now() - started,
        results,
      });
    }
    const result = await executeOne(req.body, context);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ errors: [{ message: error.message }] });
  }
});

module.exports = router;