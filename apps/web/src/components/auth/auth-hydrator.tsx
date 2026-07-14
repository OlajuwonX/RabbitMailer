"use client";

import { useEffect } from "react";
import { useAuthStore, type UserProfile } from "@/lib/store/auth-store";

export function AuthHydrator({ user }: { user: UserProfile }) {
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    setUser(user);
  }, [setUser, user]);

  return null;
}
