import { cookies } from "next/headers";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const csrfToken = (await cookies()).get("_csrf")?.value ?? "";
  return <LoginForm csrfToken={csrfToken} />;
}
