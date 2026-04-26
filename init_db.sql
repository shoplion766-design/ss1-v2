-- Script utilitaire pour créer manuellement la DB (hors Docker)
-- Usage: psql -U postgres -f init_db.sql

DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ss1_user') THEN
    CREATE ROLE ss1_user WITH LOGIN PASSWORD 'ss1_secret_2024';
  END IF;
END
$do$;

SELECT 'CREATE DATABASE ss1_db OWNER ss1_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ss1_db')\gexec

GRANT ALL PRIVILEGES ON DATABASE ss1_db TO ss1_user;
