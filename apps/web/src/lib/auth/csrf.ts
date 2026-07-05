import "server-only";
import { cookies } from "next/headers";

const CSRF_COOKIE = "_csrf_token";

// Compares the hidden form field against the httpOnly cookie set by middleware.
export async function validateCsrf(formData: FormData): Promise<boolean> {
  const store = await cookies();
  const stored = store.get(CSRF_COOKIE)?.value;
  const submitted = formData.get("csrf_token")?.toString();
  return !!(stored && submitted && stored === submitted);
}
