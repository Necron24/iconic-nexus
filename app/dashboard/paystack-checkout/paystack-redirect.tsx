"use client";

import { useEffect } from "react";

export function PaystackRedirect({ checkoutUrl }: { checkoutUrl: string }) {
  useEffect(() => {
    window.location.replace(checkoutUrl);
  }, [checkoutUrl]);

  return (
    <a className="btn-primary mt-6 inline-flex" href={checkoutUrl}>
      Continue to secure Paystack checkout
    </a>
  );
}
