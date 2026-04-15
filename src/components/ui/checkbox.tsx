import * as React from "react";

const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={`h-4 w-4 rounded border border-zinc-600 bg-zinc-800 accent-indigo-500 cursor-pointer ${className ?? ""}`}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
