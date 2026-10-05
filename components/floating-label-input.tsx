"use client";

import { useId, useState } from "react";

export function FloatingLabelInput({
  label = "Email address",
  type = "email",
}: {
  label?: string;
  type?: string;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className="relative w-72">
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="peer w-full rounded-xl border border-neutral-300 bg-white px-4 pb-2.5 pt-4 text-sm outline-none transition-colors focus:border-red-500"
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-4 top-1/2 origin-left -translate-y-1/2 text-sm transition-all duration-200 ease-out ${
          floated ? "-translate-y-[22px] scale-75" : "scale-100"
        } ${focused ? "text-red-500" : "text-neutral-500"}`}
      >
        {label}
      </label>
    </div>
  );
}
