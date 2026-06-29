import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  HTMLAttributes,
} from "react";
import { cn } from "@/lib/utils/cn";

// ─── Card ─── //
export interface LinearCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  border?: "subtle" | "accent" | "none";
}

const cardPaddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const cardBorders = {
  none: "border-transparent",
  subtle: "border-white/7",
  accent: "border-violet-500/20",
};

export function LinearCard({
  children,
  className,
  glow = false,
  hover = false,
  padding = "md",
  border = "subtle",
  ...props
}: LinearCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border backdrop-blur-2xl",
        "bg-white/3",
        cardBorders[border],
        "shadow-[0_2px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]",
        glow &&
          "shadow-[0_2px_24px_rgba(0,0,0,0.5),0_0_48px_rgba(109,40,217,0.1),inset_0_1px_0_rgba(255,255,255,0.04)]",
        hover &&
          "transition-all duration-200 cursor-pointer hover:bg-white/5 hover:border-white/12 hover:shadow-[0_4px_32px_rgba(0,0,0,0.5),0_0_32px_rgba(109,40,217,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]",
        cardPaddings[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Title ─── //
export interface LinearTitleProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

const titleSizes: Record<string, string> = {
  xs: "text-sm font-semibold",
  sm: "text-base font-semibold",
  md: "text-lg font-semibold",
  lg: "text-2xl font-bold",
  xl: "text-3xl font-bold",
  "2xl": "text-4xl font-extrabold",
};

export function LinearTitle({
  children,
  className,
  gradient = false,
  size = "md",
  as: Tag = "h2",
}: LinearTitleProps) {
  return (
    <Tag
      className={cn(
        titleSizes[size],
        "tracking-tight leading-tight",
        gradient
          ? "bg-linear-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent"
          : "text-slate-50",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

// ─── Button ─── //
export interface LinearButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
}

const buttonVariants: Record<string, string> = {
  primary: cn(
    "bg-linear-to-r from-blue-600 to-violet-600",
    "border border-violet-500/30",
    "text-white",
    "hover:from-blue-500 hover:to-violet-500",
    "shadow-[0_0_16px_rgba(124,58,237,0.2)]",
    "hover:shadow-[0_0_24px_rgba(124,58,237,0.4)]",
  ),
  secondary: cn(
    "bg-white/6 hover:bg-white/9",
    "border border-white/10 hover:border-white/16",
    "text-slate-200 hover:text-slate-50",
  ),
  ghost: cn(
    "bg-transparent hover:bg-white/6",
    "border border-transparent",
    "text-slate-400 hover:text-slate-200",
  ),
  danger: cn(
    "bg-red-950/40 hover:bg-red-900/40",
    "border border-red-500/25 hover:border-red-500/40",
    "text-red-400 hover:text-red-300",
  ),
};

const buttonSizes: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2",
};

export function LinearButton({
  children,
  className,
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  ...props
}: LinearButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium",
        "transition-all duration-150",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070f]",
        buttonVariants[variant],
        buttonSizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

// ─── Input ─── //
export interface LinearInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function LinearInput({
  label,
  error,
  hint,
  className,
  id,
  ...props
}: LinearInputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "w-full px-3.5 py-2.5 rounded-xl text-sm",
          "bg-white/4 backdrop-blur-sm",
          "border",
          error ? "border-red-500/50" : "border-white/9",
          "text-slate-100 placeholder:text-slate-600",
          "transition-all duration-150",
          "focus:outline-none",
          error
            ? "focus:border-red-500/70 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
            : "focus:border-violet-500/50 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.12)] focus:bg-white/6",
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ─── Divider ─── //
export function LinearDivider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/6", className)} />;
}

// ─── Badge ─── //
export interface LinearBadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const badgeVariants: Record<string, string> = {
  default: "bg-white/6 text-slate-300 border-white/8",
  success: "bg-emerald-950/60 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-950/60 text-amber-400 border-amber-500/20",
  danger: "bg-red-950/60 text-red-400 border-red-500/20",
  info: "bg-blue-950/60 text-blue-400 border-blue-500/20",
};

export function LinearBadge({
  children,
  variant = "default",
  className,
}: LinearBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
