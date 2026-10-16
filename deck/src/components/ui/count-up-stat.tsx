import React, { useEffect, useRef, useState } from "react";

/**
 * Splits a stat string like "85%" or "$1.2M" into a leading prefix,
 * an animatable number, and a trailing suffix so we can count up the number.
 */
function parseStat(value: string) {
  const match = value.match(/-?\d[\d,]*\.?\d*/);
  if (!match) return { prefix: "", num: null as number | null, suffix: value, decimals: 0 };
  const raw = match[0];
  const num = parseFloat(raw.replace(/,/g, ""));
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    prefix: value.slice(0, match.index),
    num,
    suffix: value.slice((match.index ?? 0) + raw.length),
    decimals,
  };
}

export default function CountUpStat({
  value,
  active,
  delay = 0,
  className,
  style,
}: {
  value: string;
  active: boolean;
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { prefix, num, suffix, decimals } = parseStat(value);
  const [display, setDisplay] = useState(num === null ? value : `${prefix}0${suffix}`);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (num === null) {
      setDisplay(value);
      return;
    }
    if (!active) {
      setDisplay(`${prefix}0${suffix}`);
      return;
    }

    const duration = 1400;
    let startTime: number | null = null;
    const startDelay = delay * 1000;

    const tick = (t: number) => {
      if (startTime === null) startTime = t;
      const elapsed = t - startTime - startDelay;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = num * eased;
      const valueText =
        decimals > 0
          ? current.toFixed(decimals)
          : Math.round(current).toLocaleString("en-US");
      setDisplay(`${prefix}${valueText}${suffix}`);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, value]);

  return (
    <span className={className} style={style}>
      {display}
    </span>
  );
}
