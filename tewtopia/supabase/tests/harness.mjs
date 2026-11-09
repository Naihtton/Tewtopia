// In-memory Postgres (PGlite) with just enough of Supabase to run schema.sql:
// the anon / authenticated / service_role roles, auth.users, auth.uid(), auth.role(),
// and Supabase's default privileges (new tables and functions are granted to
// anon + authenticated, so schema.sql's own revokes are what actually protect data).
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const SCHEMA_PATH = new URL('../schema.sql', import.meta.url);

export async function freshDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create function auth.role() returns text language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
    alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
    alter default privileges in schema public grant usage, select on sequences to anon, authenticated;
    alter default privileges in schema public grant execute on functions to anon, authenticated;
  `);

  // pgcrypto isn't bundled; gen_random_uuid() is built in on PG 13+.
  const schema = readFileSync(SCHEMA_PATH, 'utf8').replace(/create extension if not exists pgcrypto;/, '');
  await db.exec(schema);
  await db.exec(schema); // must be idempotent
  return db;
}

/** Act as a Supabase client role (sets the JWT claims auth.uid()/auth.role() read). */
export async function as(db, role, userId = '') {
  await db.exec(`reset role`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claim.role', $2, false)`, [
    userId,
    role,
  ]);
  await db.exec(`set role ${role}`);
}

/** Back to the superuser (like the SQL editor / migrations). */
export async function reset(db) {
  await db.exec(`reset role`);
  await db.query(`select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claim.role', '', false)`);
}

/** Simulate a Supabase sign-up: insert into auth.users as superuser (fires handle_new_user). */
export async function signUp(db, id, email, meta = {}) {
  await reset(db);
  await db.query(`insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)`, [id, email, JSON.stringify(meta)]);
}

export async function rows(db, sql, params = []) {
  return (await db.query(sql, params)).rows;
}

/** Resolves to the error message, or null if the statement succeeded. */
export async function errorOf(db, sql, params = []) {
  try {
    await db.query(sql, params);
    return null;
  } catch (error) {
    return error.message;
  }
}
