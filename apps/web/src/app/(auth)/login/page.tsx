import { headers } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const csrfToken = (await headers()).get("x-csrf-token") ?? "";
  return <LoginForm csrfToken={csrfToken} />;
}
