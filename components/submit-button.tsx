"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleText: ReactNode;
  pendingText?: ReactNode;
  icon?: ReactNode;
};

export function SubmitButton({ idleText, pendingText = "Please wait…", icon, className = "btn-primary", disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} gap-2 disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {pending ? <LoaderCircle className="animate-spin" size={17} /> : icon}
      {pending ? pendingText : idleText}
    </button>
  );
}
