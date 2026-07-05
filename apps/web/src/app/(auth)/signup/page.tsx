import { cookies } from "next/headers";
import { SignupForm } from "@/components/auth/signup-form";

export default async function SignupPage() {
  const csrfToken = (await cookies()).get("_csrf")?.value ?? "";
  return <SignupForm csrfToken={csrfToken} />;
}
