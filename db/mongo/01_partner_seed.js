const database = db.getSiblingDB(
  process.env.MONGO_INITDB_DATABASE || "marketvault"
);

if (database.partner_users.countDocuments({}) === 0) {
  database.partner_users.insertMany([
    {
      username: "admin",
      password: "VaultAdmin#2026",
      passwordHash:
        "$2b$12$pc3G2tqehN.MB3O5/p7Ji.r3q6xzqV.cDWRla0zluYknpjMZysZxa",
      email: "partner-admin@academy.local",
      role: "admin",
      active: true
    },
    {
      username: "partner",
      password: "partner123",
      passwordHash:
        "$2b$12$JvSCFDO/9g1Q4YEXxQ4CYOao9tDqnfyQqgGjqr6329FDsoy6GijU.",
      email: "partner@academy.local",
      role: "partner",
      active: true
    }
  ]);
}

database.partner_users.createIndex({ username: 1 }, { unique: true });