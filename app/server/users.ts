import bcrypt from "bcrypt";

import { getDb, newId, updateDb } from "./db";
import type { PublicUser, StoredUser } from "./types";

const BCRYPT_ROUNDS = 10;

function toPublic(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export async function findUserByUsername(
  username: string,
): Promise<StoredUser | undefined> {
  const db = await getDb();
  const wanted = username.trim().toLowerCase();
  return db.users.find((u) => u.username.toLowerCase() === wanted);
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | undefined> {
  const db = await getDb();
  const wanted = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === wanted);
}

export async function findUserById(
  id: string,
): Promise<PublicUser | undefined> {
  const db = await getDb();
  const user = db.users.find((u) => u.id === id);
  return user ? toPublic(user) : undefined;
}

export class DuplicateUserError extends Error {
  constructor(public field: "username" | "email") {
    super(`A user with this ${field} already exists`);
  }
}

/** Register a new user with a bcrypt-hashed password. */
export async function createUser(input: {
  username: string;
  email: string;
  name: string;
  password: string;
}): Promise<PublicUser> {
  const username = input.username.trim();
  const email = input.email.trim();

  if (await findUserByUsername(username)) {
    throw new DuplicateUserError("username");
  }
  if (await findUserByEmail(email)) {
    throw new DuplicateUserError("email");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const { result } = await updateDb((db) => {
    const user: StoredUser = {
      id: newId("usr"),
      username,
      email,
      name: input.name.trim() || username,
      role: "CUSTOMER",
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return toPublic(user);
  });

  return result;
}

/**
 * A fixed bcrypt hash of a random throwaway password.
 *
 * `verifyCredentials` used to return null the moment a username was not found,
 * without running any comparison. That made the response measurably faster than
 * for an existing user, so the endpoint leaked which usernames are registered —
 * an attacker enumerates valid accounts without ever sending a password.
 *
 * Comparing against this instead keeps both branches doing one bcrypt
 * comparison, so they cost the same.
 */
const DUMMY_PASSWORD_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8.QjLQhGk6VpVXwLQYQ0Vc1OaOaOaO";

/** Verify a username/password pair; returns the public user or null. */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<PublicUser | null> {
  const db = await getDb();
  const wanted = username.trim().toLowerCase();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === wanted || u.email.toLowerCase() === wanted,
  );
  // Always run a comparison: a missing user must not be distinguishable by
  // response time.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !ok) return null;
  return toPublic(user);
}
