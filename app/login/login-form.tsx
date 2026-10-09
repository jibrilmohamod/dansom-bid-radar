"use client";

import { useActionState } from "react";
import { login, type LoginState } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} style={{ display: "grid", gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <label htmlFor="password">
        Password
        <input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
      </label>
      {state.error ? <p className="error" role="alert">{state.error}</p> : null}
      <button className="primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
