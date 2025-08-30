import { ComponentPropsWithoutRef, CSSProperties, FC } from "react";

import { cn } from "@/lib/utils";

export interface AnimatedShinyTextProps
  extends ComponentPropsWithoutRef<"span"> {
  shimmerWidth?: number;
  speed?: number; // Add speed control
}

export const AnimatedShinyText: FC<AnimatedShinyTextProps> = ({
  children,
  className,
  shimmerWidth = 100,
  speed = 0.5, // Faster default speed
  ...props
}) => {
  return (
    <span
      style={
        {
          "--shiny-width": `${shimmerWidth}px`,
          "--speed": `${speed}s`,
        } as CSSProperties
      }
      className={cn(
        "mx-auto max-w-md text-black dark:text-black", // Force black text
        "animate-shiny-text bg-clip-text bg-no-repeat [background-position:0_0] [background-size:var(--shiny-width)_100%] [transition:background-position_var(--speed)_linear_infinite]",
        "bg-gradient-to-r from-transparent via-white via-50% to-transparent", // White shine
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
};