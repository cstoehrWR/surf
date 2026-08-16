import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger" }) {
  const styles = {
    primary: "bg-teal-700 text-white hover:bg-teal-800 shadow-sm",
    ghost: "bg-transparent hover:bg-teal-50",
    outline: "border border-teal-200 bg-white hover:bg-teal-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  } as const;
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50",
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
