"use client";
import { useEffect, useState } from "react";
import { useMotionValue, useSpring, useMotionValueEvent } from "motion/react";

type CountUpProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
};

/**
 * Spring-based count-up. Per Emil Kowalski's animation philosophy:
 * - Springs feel more natural than fixed-duration easing (real physics, settles)
 * - Interruptible — if the value changes mid-animation, it retargets smoothly
 *   instead of restarting from zero
 * - No bounce (damping high enough to settle cleanly for numeric data)
 */
export default function CountUp({ value, prefix = "", suffix = "", format }: CountUpProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 60,
    damping: 18,
    mass: 1,
    restDelta: 0.5,
  });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useMotionValueEvent(spring, "change", latest => {
    setDisplay(latest);
  });

  const rounded = Math.round(display);
  const formatted = format ? format(rounded) : rounded.toLocaleString();

  return <>{prefix}{formatted}{suffix}</>;
}
