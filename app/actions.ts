"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { setStatus, type Status } from "@/lib/radar";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken } from "@/lib/session";

const STATUSES: Status[] = ["new", "pursuing", "skip", "submitted"];

async function requireSession() {
  const jar = await cookies();
  if (!(await verifySessionToken(jar.get(SESSION_COOKIE)?.value))) redirect("/login");
}

export async function updateStatus(id: string, status: Status) {
  await requireSession();
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  await setStatus(id, status);
  revalidatePath("/");
}

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const password = String(form.get("password") ?? "");
  const expected = process.env.SITE_PASSWORD;
  if (!expected) return { error: "The site password has not been configured yet." };
  if (password !== expected) return { error: "That password is not right. Check it and try again." };

  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), sessionCookieOptions);

  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
