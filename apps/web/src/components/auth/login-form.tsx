"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import toast from "react-hot-toast";
import { loginAction } from "@/app/actions/auth";
import {
  LinearCard,
  LinearTitle,
  LinearButton,
  LinearInput,
} from "@/components/ui/linear";
import { LinearPasswordInput } from "@/components/ui/password-input";
import type { ActionResult } from "@repo/shared-types";

const initialState: ActionResult = { success: true };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <LinearButton type="submit" fullWidth loading={pending} size="md">
      {pending ? "Signing in…" : "Sign in"}
    </LinearButton>
  );
}

export function LoginForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const formError = !state.success ? state.error : undefined;

  useEffect(() => {
    if (!state.success && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <LinearCard padding="md" border="accent">
      <div className="space-y-6">
        <div className="space-y-1">
          <LinearTitle size="md" className="text-center">
            Welcome back
          </LinearTitle>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="csrf_token" value={csrfToken} />
          <LinearInput
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            error={formError}
          />

          <LinearPasswordInput
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            error={formError}
          />

          <div className="flex justify-end -mt-1">
            <span className="text-xs text-slate-600 cursor-not-allowed select-none">
              Forgot password?
            </span>
          </div>

          {!state.success && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-500/20 px-4 py-3"
            >
              <svg
                className="shrink-0 h-4 w-4 text-red-400 mt-0.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-sm text-slate-500">
          No account yet?{" "}
          <Link
            href="/signup"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Create one
          </Link>
        </p>
      </div>
    </LinearCard>
  );
}
