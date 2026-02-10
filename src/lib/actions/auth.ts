"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, generateAuthToken } from "@/lib/auth";

export async function login(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username and password are required" };
  }

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;

  if (username !== expectedUsername || password !== expectedPassword) {
    return { success: false, error: "Invalid credentials" };
  }

  const token = await generateAuthToken(username, password);
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return { success: true };
}
