"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import {
  LinearCard,
  LinearTitle,
  LinearButton,
  LinearInput,
} from "@/components/ui/linear";
import type { ActionResult } from "@repo/shared-types";

const initialState: ActionResult = { success: true };

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <LinearCard padding="lg" glow border="accent">
      <div className="space-y-6">
        <div className="space-y-1">
          <LinearTitle size="md" className="text-center">
            Create your account
          </LinearTitle>
        </div>

        <form action={formAction} className="space-y-4">
          <LinearInput
            id="name"
            name="name"
            type="text"
            label="Full name"
            autoComplete="name"
            required
            placeholder="Jane Smith"
          />

          <LinearInput
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />

          <LinearInput
            id="password"
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            required
            placeholder="Min. 8 characters"
            hint="At least 8 characters"
          />

          <LinearInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label="Confirm password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />

          {!state.success && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-950/40 border border-red-500/20 px-4 py-3">
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

          <LinearButton type="submit" fullWidth loading={isPending} size="md">
            {isPending ? "Creating account…" : "Create account"}
          </LinearButton>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </LinearCard>
  );
}
