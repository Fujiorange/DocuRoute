#!/bin/bash
# Production-safe migration: prisma migrate deploy only.
# NEVER run prisma migrate dev in production  it can drop data.
# Always take a Supabase manual backup before running this.
set -e
echo "Running database migrations..."
cd packages/db && npx prisma migrate deploy
echo "Migrations complete."
