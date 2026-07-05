"use client";

import { useState, useEffect } from "react";

// Reads the non-httponly _csrf cookie set by middleware.
// Returns the CSRF token for inclusion as a hidden form field.
export function useCsrfToken(): string {
  const [token, setToken] = useState("");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/);
    setToken(m?.[1] ? decodeURIComponent(m[1]) : "");
  }, []);
  return token;
}
