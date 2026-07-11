"use client";

import { useAuthStore } from "@/lib/store/auth-store";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";

export function useAuth() {
  const { user, isAuthenticated, clearUser } = useAuthStore();
  const router = useRouter();

  async function logout() {
    clearUser(); // Clear Zustand state before the server redirect fires
    await logoutAction();
    router.replace("/login");
  }

  return { user, isAuthenticated, logout };
}
