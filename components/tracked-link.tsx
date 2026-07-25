"use client";

import type { ComponentProps } from "react";
import {
  trackAnalyticsEvent,
  type AnalyticsTargetType
} from "@/lib/analytics/client";

export function TrackedLink({
  targetType,
  targetId,
  onClick,
  ...props
}: ComponentProps<"a"> & {
  targetType: AnalyticsTargetType;
  targetId: string;
}) {
  return (
    <a
      {...props}
      onClick={(event) => {
        void trackAnalyticsEvent("link_click", targetType, targetId);
        onClick?.(event);
      }}
    />
  );
}
