/* UAT harness for the admin vehicle dashboard.
 * Read/write through the REAL app APIs (never resets or deletes app data).
 * Uses the app's own JWT format (jose + AUTH_SECRET) to act as admin/customer.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { SignJWT } = require("jose");

const BASE = process.env.UAT_BASE || "http://localhost:3000";
const SECRET =
  process.env.AUTH_SECRET ||
  "progressive-autohub-dev-secret-change-me-in-production";
const COOKIE = "pah_session";
const CONN =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:51214/autoconnect?sslmode=disable";

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " :: " + detail : ""}`);
};

async function mint(role, email) {
  const key = new TextEncoder().encode(SECRET);
  return new SignJWT({
    id: role === "ADMIN" ? "usr_admin_1" : "usr_customer_1",
    username: role.toLowerCase(),
    email,
    name: role === "ADMIN" ? "AutoHub Admin" : "Test Customer",
    role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

const api = async (p, opts = {}, cookie) =>
  fetch(BASE + p, {
    ...opts,
    headers: {
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: `${COOKIE}=${cookie}` } : {}),
      ...(opts.headers || {}),
    },
    redirect: opts.redirect || "manual",
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { fs, path, Client, BASE, COOKIE, CONN, results, record, mint, api, sleep };