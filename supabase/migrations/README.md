# Supabase database migrations

This directory stores version-controlled SQL changes for the HealthOS AI Supabase project.

## Important deployment rule

- A migration committed here is a source-control record; GitHub does not automatically apply it to Supabase.
- Apply each migration to the intended Supabase project using the approved migration workflow, then verify the resulting schema and permissions.
- Do not assume a GitHub commit means the database has been changed, or that a database change is automatically committed to GitHub.
- Never place service-role keys, database passwords, access tokens, patient data, or other secrets in migration files.

## Current coverage

- `20261101170000_department_performance_engine.sql` records Step 7, which was applied directly to the active Supabase project on 2026-11-01 and subsequently verified.

Earlier workforce-engine steps (department catalogue, professional roles, units and staff assignments, duties, tasks, and management assignments) were created directly in Supabase in earlier work. Their original SQL migration texts were not present in this repository when this directory was established. They must be reconstructed from the live schema and reviewed before being added as historical migrations. Do not create guessed historical migrations or run them against a database that already contains those objects.

## Before production

Use a clean Supabase staging project to test the full migration chain, RLS, RPC authorization, tenant isolation, and rollback/recovery procedures before production deployment.
