import { NextRequest } from "next/server";

export const PUBLIC_EVENT_COOKIE = "badgeflow_public_event";

const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export interface PublicEventSession {
  eventId: string;
  /** Permanent event public ID; never replace this with the slug. */
  publicId: string;
  /** Human-readable event slug used in browser URLs. */
  slug?: string;
  expiresAt: number;
}

interface TokenPayload extends PublicEventSession {
  signature: string;
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return secret;
}

function stringToBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToString(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createSignature(payload: string) {
  const key = await getSigningKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function verifySignature(payload: string, signature: string) {
  try {
    const key = await getSigningKey();
    return await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(signature),
      new TextEncoder().encode(payload),
    );
  } catch {
    return false;
  }
}

/**
 * `publicId` is the permanent event ID. `slug` is optional to keep existing
 * callers source-compatible, but new login flows should always pass it.
 */
export async function createPublicEventToken(
  eventId: string,
  publicId: string,
  slug?: string,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
  const payloadObject: PublicEventSession = {
    eventId,
    publicId,
    ...(slug ? { slug } : {}),
    expiresAt,
  };
  const payload = stringToBase64Url(JSON.stringify(payloadObject));
  const signature = await createSignature(payload);
  return `${payload}.${signature}`;
}

/**
 * Accepts either the permanent publicId or the slug as the URL identifier.
 * Legacy tokens without a slug still work with their permanent publicId.
 */
export async function verifyPublicEventToken(
  token: string,
  expectedIdentifier?: string,
) {
  try {
    if (!token) return null;
    const separatorIndex = token.lastIndexOf(".");
    if (separatorIndex <= 0) return null;

    const payload = token.slice(0, separatorIndex);
    const signature = token.slice(separatorIndex + 1);
    if (!(await verifySignature(payload, signature))) return null;

    const session = JSON.parse(base64UrlToString(payload)) as PublicEventSession;
    if (!session.eventId || !session.publicId || !session.expiresAt) return null;

    if (
      expectedIdentifier &&
      session.publicId !== expectedIdentifier &&
      session.slug !== expectedIdentifier
    ) {
      return null;
    }

    if (session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getPublicEventSession(
  request: Request,
  expectedIdentifier?: string,
) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const targetCookie = cookieHeader.split(";").find((cookie) => {
    const separatorIndex = cookie.indexOf("=");
    return separatorIndex !== -1 &&
      cookie.slice(0, separatorIndex).trim() === PUBLIC_EVENT_COOKIE;
  });
  if (!targetCookie) return null;

  const separatorIndex = targetCookie.indexOf("=");
  const token = targetCookie.slice(separatorIndex + 1).trim();
  if (!token) return null;

  return verifyPublicEventToken(token, expectedIdentifier);
}

export async function getPublicEventSessionFromRequest(
  request: NextRequest,
  expectedIdentifier?: string,
) {
  const token = request.cookies.get(PUBLIC_EVENT_COOKIE)?.value;
  if (!token) return null;
  return verifyPublicEventToken(token, expectedIdentifier);
}

export { SESSION_DURATION_SECONDS };
