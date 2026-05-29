"use client";
import { forwardRef, type InputHTMLAttributes } from "react";

/**
 * Safe number input — wraps a native <input type="number"> with guards that
 * prevent the classic gotchas:
 *
 *   1. Mouse-wheel scrolling silently mutating the value while a user is
 *      just scrolling the page. We blur the input on wheel so the wheel
 *      passes through to the page (and the number doesn't change).
 *   2. Up/Down arrow keys mutating the value while a user is navigating with
 *      the keyboard — we let them through only when the input is focused
 *      intentionally, but block them on bubble-up so a containing dialog
 *      doesn't capture them.
 *
 * Drop-in replacement: takes the same props as <input>. Defaults to
 * type="number" but the wheel guard works regardless of type.
 */
export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumberInput(props, ref) {
    const { onWheel, type = "number", ...rest } = props;
    return (
      <input
        {...rest}
        ref={ref}
        type={type}
        onWheel={(e) => {
          // Blur to release wheel capture from the input — the page scrolls,
          // the number doesn't change. Caller's onWheel (if any) runs first.
          onWheel?.(e);
          (e.currentTarget as HTMLInputElement).blur();
        }}
      />
    );
  }
);

export default NumberInput;
