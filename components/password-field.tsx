"use client";

import { Eye, EyeOff, LockKeyhole, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  showStrength?: boolean;
  matchValue?: string;
  matchLabel?: string;
};

function passwordScore(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
}

const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"];
const strengthWidths = ["8%", "25%", "50%", "75%", "100%"];

export function PasswordField({
  name,
  label,
  autoComplete,
  placeholder = "••••••••",
  minLength = 8,
  required = true,
  value,
  onChange,
  showStrength = false,
  matchValue,
  matchLabel = "Passwords match"
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const currentValue = value ?? internalValue;
  const score = useMemo(() => passwordScore(currentValue), [currentValue]);
  const hasMatchTarget = typeof matchValue === "string";
  const matches = hasMatchTarget && currentValue.length > 0 && currentValue === matchValue;
  const mismatch = hasMatchTarget && currentValue.length > 0 && currentValue !== matchValue;

  return (
    <label className="block">
      <span className="label flex items-center gap-2"><LockKeyhole size={15} />{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className="field pr-12"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const next = event.currentTarget.value;
            if (onChange) onChange(next);
            else setInternalValue(next);
          }}
          onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))}
          onKeyDown={(event) => setCapsLock(event.getModifierState("CapsLock"))}
          onBlur={() => setCapsLock(false)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-soft transition hover:bg-white/10 hover:text-white"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </span>

      {capsLock && (
        <span className="mt-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
          <TriangleAlert size={14} /> Caps Lock is on
        </span>
      )}

      {showStrength && currentValue.length > 0 && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-lime transition-all"
              style={{ width: strengthWidths[score] }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-soft">Strength: <span className="text-white">{strengthLabels[score]}</span></span>
            <span className="text-soft">Use 12+ chars, capitals, numbers and symbols</span>
          </div>
        </div>
      )}

      {matches && <span className="mt-2 block text-xs font-semibold text-lime">✓ {matchLabel}</span>}
      {mismatch && <span className="mt-2 block text-xs font-semibold text-rose-300">Passwords do not match yet.</span>}
    </label>
  );
}

export function PasswordPairFields({
  passwordLabel = "Password",
  confirmLabel = "Confirm password"
}: {
  passwordLabel?: string;
  confirmLabel?: string;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  return (
    <>
      <PasswordField
        name="password"
        label={passwordLabel}
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        showStrength
      />
      <PasswordField
        name="confirmPassword"
        label={confirmLabel}
        autoComplete="new-password"
        value={confirmation}
        onChange={setConfirmation}
        matchValue={password}
      />
    </>
  );
}
