"use client";

import { useState, useEffect } from "react";

// Reads the non-httponly _csrf cookie (set by middleware) for use in hidden form fields.
export function useCsrfToken(): string {
  const [token, setToken] = useState("");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)_csrf=([^;]+)/);
    setToken(m?.[1] ? decodeURIComponent(m[1]) : "");
  }, []);
  return token;
}
