"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import toast from "react-hot-toast";
import { signupAction } from "@/app/actions/auth";
import {
  LinearCard,
  LinearTitle,
  LinearButton,
  LinearInput,
} from "@/components/ui/linear";
import { LinearPasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils/cn";
import type { ActionResult } from "@repo/shared-types";

const initialState: ActionResult = { success: true };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <LinearButton
      type="submit"
      fullWidth
      loading={pending}
      size="md"
      disabled={pending || disabled}
    >
      {pending ? "Creating account…" : "Create account"}
    </LinearButton>
  );
}

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(pw: string): { level: 1 | 2 | 3; label: string } | null {
  if (!pw) return null;
  if (pw.length < 8) return { level: 1, label: "Weak" };
  if (pw.length < 12) return { level: 2, label: "Moderate" };
  return { level: 3, label: "Strong" };
}

const STRENGTH_STYLE = {
  1: { bar: "bg-red-500", text: "text-red-400" },
  2: { bar: "bg-amber-400", text: "text-amber-400" },
  3: { bar: "bg-emerald-500", text: "text-emerald-400" },
} as const;

function PasswordStrengthBar({ password }: { password: string }) {
  const s = getStrength(password);
  if (!s) return null;
  const { bar, text } = STRENGTH_STYLE[s.level];
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {([1, 2, 3] as const).map((seg) => (
          <div
            key={seg}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              seg <= s.level ? bar : "bg-white/10",
            )}
          />
        ))}
      </div>
      <span className={cn("text-xs font-medium shrink-0", text)}>{s.label}</span>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function SignupForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(signupAction, initialState);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Show mismatch error only after the user has started typing in confirm field
  const mismatch = confirm.length > 0 && password !== confirm;
  const formError = !state.success ? state.error : undefined;

  useEffect(() => {
    if (!state.success && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <LinearCard padding="md" border="accent">
      <div className="space-y-6">
        <LinearTitle size="md" className="text-center">
          Create your account
        </LinearTitle>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="csrf_token" value={csrfToken} />

          <LinearInput
            id="name"
            name="name"
            type="text"
            label="Full name"
            autoComplete="name"
            required
            placeholder="Jane Smith"
            error={formError}
          />

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

          {/* Password field + strength bar */}
          <div>
            <LinearPasswordInput
              id="password"
              name="password"
              label="Password"
              autoComplete="new-password"
              required
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={formError}
            />
            <PasswordStrengthBar password={password} />
          </div>

          {/* Confirm password field — shows inline error on mismatch */}
          <LinearPasswordInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={mismatch ? "Passwords do not match" : undefined}
          />

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

          {/* Disabled when passwords are visibly mismatched */}
          <SubmitButton disabled={mismatch} />
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
