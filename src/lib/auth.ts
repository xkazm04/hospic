export const AUTH_COOKIE_NAME = "mc_auth";

export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_DEVELOPMENT === "true";
}

export async function generateAuthToken(
  username: string,
  password: string
): Promise<string> {
  const data = new TextEncoder().encode(`${username}:${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getExpectedToken(): Promise<string> {
  const username = process.env.AUTH_USERNAME ?? "";
  const password = process.env.AUTH_PASSWORD ?? "";
  return generateAuthToken(username, password);
}
