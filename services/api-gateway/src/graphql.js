const { buildSchema } = require("graphql");
const { pool, one } = require("./db");
const { flagFor } = require("./flags");

const schema = buildSchema(`
  type Review {
    id: ID!
    rating: Int!
    body: String!
    author: User!
  }

  type Product {
    id: ID!
    title: String!
    price: Int!
    seller: String
    stock: Int!
    reviews: [Review!]!
  }

  type OrderItem {
    title: String!
    quantity: Int!
    price: Int!
  }

  type Order {
    id: ID!
    buyerId: ID!
    total: Int!
    status: String!
    address: String
    notes: String
    items: [OrderItem!]!
    flag: String
  }

  type User {
    id: ID!
    username: String!
    role: String!
    orders: [Order!]!
  }

  type AdminSummary {
    users: Int!
    orders: Int!
    revenue: Int!
  }

  type Diagnostics {
    service: String!
    uptime: Int!
    flag: String!
  }

  type Query {
    products(first: Int = 10): [Product!]!
    product(id: ID!): Product
    order(id: ID!): Order
    me: User
    adminSummary: AdminSummary
    systemDiagnostics: Diagnostics
  }
`);

async function reviewsFor(productId) {
  const result = await pool.query(
    "SELECT id, rating, body, author_id FROM inventory.reviews WHERE product_id = $1",
    [productId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    rating: row.rating,
    body: row.body,
    author: async () => {
      const author = await one(
        "SELECT id, username, role FROM auth.users WHERE id = $1",
        [row.author_id]
      );
      return author
        ? { id: String(author.id), username: author.username, role: author.role }
        : { id: "", username: "unknown", role: "student" };
    },
  }));
}

const root = {
  products: async ({ first }) => {
    const limit = Math.min(Math.max(first || 10, 1), 200);
    const result = await pool.query(
      "SELECT id, title, price, seller, stock FROM inventory.products ORDER BY id LIMIT $1",
      [limit]
    );
    return result.rows.map((row) => ({
      ...row,
      reviews: async () => reviewsFor(row.id),
    }));
  },

  product: async ({ id }) => {
    const row = await one(
      "SELECT id, title, price, seller, stock FROM inventory.products WHERE id = $1",
      [id]
    );
    if (!row) {
      return null;
    }
    return { ...row, reviews: async () => reviewsFor(row.id) };
  },

  order: async ({ id }, context) => {
    const order = await one("SELECT * FROM inventory.orders WHERE id = $1", [id]);
    if (!order) {
      return null;
    }
    const items = await pool.query(
      "SELECT title, quantity, price FROM inventory.order_items WHERE order_id = $1",
      [id]
    );
    let flag = null;
    if (context.user && String(order.user_id) !== String(context.user.sub)) {
      flag = await flagFor("graphql-idor", "MV{GRAPHQL_IDOR_ORDER}");
    }
    return {
      id: order.id,
      buyerId: String(order.user_id),
      total: order.total,
      status: order.status,
      address: order.address,
      notes: order.notes,
      items: items.rows,
      flag,
    };
  },

  me: async (_args, context) => {
    if (!context.user) {
      return null;
    }
    const user = await one(
      "SELECT id, username, role FROM auth.users WHERE id = $1",
      [context.user.sub]
    );
    if (!user) {
      return null;
    }
    return {
      id: String(user.id),
      username: user.username,
      role: user.role,
      orders: async () => {
        const orders = await pool.query(
          "SELECT * FROM inventory.orders WHERE user_id = $1 ORDER BY id",
          [user.id]
        );
        return orders.rows.map((order) => ({
          id: order.id,
          buyerId: String(order.user_id),
          total: order.total,
          status: order.status,
          address: order.address,
          notes: order.notes,
          items: [],
          flag: null,
        }));
      },
    };
  },

  adminSummary: async (_args, context) => {
    if (!context.user) {
      return null;
    }
    const users = await one("SELECT COUNT(*) AS c FROM auth.users");
    const orders = await one("SELECT COUNT(*) AS c FROM inventory.orders");
    const revenue = await one(
      "SELECT COALESCE(SUM(total), 0) AS c FROM inventory.orders WHERE status = 'paid'"
    );
    return {
      users: Number(users.c),
      orders: Number(orders.c),
      revenue: Number(revenue.c),
    };
  },

  systemDiagnostics: async () => ({
    service: "api-gateway",
    uptime: Math.floor(process.uptime()),
    flag: await flagFor("graphql-introspection", "MV{GRAPHQL_INTROSPECTION}"),
  }),
};

module.exports = { schema, root };