#!/bin/sh
set -euo pipefail

# ────────────────────────────────────────────────────────────────────────────────
#  Create multiple databases + grant privileges to POSTGRES_USER (admin)
#  Idempotent: skips if database already exists
# ────────────────────────────────────────────────────────────────────────────────

echo "Initializing multiple databases for microservices..."

databases=(
  "auth_db"
  "user_db"
  "order_db"
  "payment_db"
  "notification_db"
  "product_db"
  "inventory_db"
  "analytics_db"
)

for db in "${databases[@]}"; do
  echo "→ Processing database: $db"

  # Check if database exists
  if psql -U "$POSTGRES_USER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1; then
    echo "  Database '$db' already exists → skipping creation"
  else
    echo "  Creating database '$db'..."
    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<-EOSQL
      CREATE DATABASE $db;
EOSQL
  fi

  # Always (re)grant privileges — safe and idempotent
  echo "  Granting ALL PRIVILEGES on '$db' to $POSTGRES_USER..."
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE "$db" TO "$POSTGRES_USER";
EOSQL
done

echo "──────────────────────────────────────────────"
echo "All databases processed successfully!"
echo "You can now connect to them using user '$POSTGRES_USER'"