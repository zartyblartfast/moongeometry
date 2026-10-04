import { formatTimeScrubberValue } from "@/lib/time-scrubber";
import type { KeyboardEvent } from "react";

type Props = {
  minute: number;
  onChange: (minute: number) => void;
};

export function TimeScrubber({ minute, onChange }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = event.shiftKey ? 60 : 5;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = minute - step;
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = minute + step;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 24 * 60 - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onChange(Math.min(24 * 60 - 1, Math.max(0, next)));
  };

  return (
    <div>
      <input
        type="range"
        min={0}
        max={24 * 60 - 1}
        step={1}
        value={minute}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={onKeyDown}
        aria-label="Scrub mean solar time through the selected day"
        aria-valuetext={formatTimeScrubberValue(minute)}
        className="h-3 w-full accent-gold"
      />
      <div
        aria-hidden="true"
        className="-mt-1 flex justify-between px-0.5 text-[0.55rem] leading-none text-muted"
      >
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
    </div>
  );
}
