"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends the viewer to today's edition in their own time zone when none is specified. */
export function LocalEdition({ hasDate }: { hasDate: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (hasDate) return;
    const now = new Date();
    const tz = -now.getTimezoneOffset();
    const local = new Date(now.getTime() + tz * 60000).toISOString().slice(0, 10);
    router.replace(`/news?date=${local}&tz=${tz}`);
  }, [hasDate, router]);
  return null;
}
