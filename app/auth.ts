import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type InvoicyUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

const USER_EMAIL_HEADER =
  process.env.INVOICY_USER_EMAIL_HEADER ?? "x-invoicy-user-email";
const USER_NAME_HEADER =
  process.env.INVOICY_USER_NAME_HEADER ?? "x-invoicy-user-name";
const SIGN_IN_PATH = process.env.INVOICY_SIGN_IN_PATH ?? "/login";
const SIGN_OUT_PATH = process.env.INVOICY_SIGN_OUT_PATH ?? "/logout";

export async function getUser(): Promise<InvoicyUser | null> {
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER)?.trim();
  if (!email) return null;

  const encodedName = requestHeaders.get(USER_NAME_HEADER)?.trim();
  const fullName = encodedName ? decodeUserName(encodedName) : null;

  return {
    displayName: fullName ?? email,
    email,
    fullName,
  };
}

export async function requireUser(returnTo: string): Promise<InvoicyUser> {
  const user = await getUser();
  if (user) return user;

  redirect(signInPath(returnTo));
}

export function signInPath(returnTo: string): string {
  return authPath(SIGN_IN_PATH, returnTo);
}

export function signOutPath(returnTo = "/"): string {
  return authPath(SIGN_OUT_PATH, returnTo);
}

function authPath(path: string, returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${safeAuthPath(path)}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeAuthPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/login";
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function decodeUserName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
