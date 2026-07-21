"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
    };

export function useServerActionResult(
  result: ActionResult | null,
  successMessage = "Done!",
) {
  const { success, error } = useToast();

  useEffect(() => {
    if (!result) return;
    if (result.success) success(successMessage);
    else error(result.error);
  }, [error, result, success, successMessage]);
}
