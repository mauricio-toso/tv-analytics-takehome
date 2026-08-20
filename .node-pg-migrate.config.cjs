// node-pg-migrate configuration
// See: https://salsita.github.io/node-pg-migrate/#/config
//
// Note: DATABASE_URL is set by scripts/run-migrate.js wrapper (loaded from .env with fallback defaults)

module.exports = {
  // Migration directory
  dir: "migrations",

  // Exclude non-migration files from directory scan
  // migrations/schema.reference.sql is a reference artifact from T-02, not a migration
  // Using kebab-case to match CLI option naming convention
  "ignore-pattern": ".*schema\\.reference\\.sql$",

  // Migration file naming: timestamp prefix for ordering
  migrationsTable: "pgmigrations",

  // TypeScript support (node-pg-migrate will look for .ts files and transpile)
  // Since we have @types/node installed, we can use TypeScript for migrations
  // But for simplicity and to match the SQL reference, using .sql files
  createMigrationsSchema: false,

  // Check migration order
  checkOrder: true,
};
