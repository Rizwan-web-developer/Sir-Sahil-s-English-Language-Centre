import { cn } from "@/lib/utils";

type LogoProps = {
  /** `onDark` renders light wordmark for the navy sidebar / auth hero. */
  variant?: "default" | "onDark";
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  logoUrl?: string | null;
  /** Platform name from settings. Falls back to the institute wordmark. */
  name?: string | null;
  className?: string;
};

const markSizes = {
  sm: "size-8 text-base rounded-lg",
  md: "size-10 text-xl rounded-xl",
  lg: "size-12 text-2xl rounded-2xl",
} as const;

const nameSizes = {
  small: "text-[0.6rem]",
  base: "text-[0.65rem]",
  large: "text-xs",
};

/**
 * Brand mark: deep navy tile with a gold serif S and a refined wordmark.
 * Pure CSS/SVG so it is crisp in print, PDF and dark mode.
 */
export function Logo({
  variant = "default",
  size = "md",
  showWordmark = true,
  logoUrl,
  name,
  className,
}: LogoProps) {
  const onDark = variant === "onDark";
  const imageSizes = { sm: "h-8 w-auto", md: "h-10 w-auto", lg: "h-12 w-auto" } as const;
  const customName = name?.trim();

  return (
    <span className={cn("inline-flex select-none items-center gap-3", className)}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="Institute logo" className={cn("shrink-0 object-contain", imageSizes[size])} />
      ) : (
        <span
          aria-hidden
          className={cn(
            "relative grid shrink-0 place-items-center bg-[#15345c] font-heading font-semibold text-gold shadow-sm ring-1 ring-gold/45",
            markSizes[size],
          )}
        >
          <span className="absolute inset-[3px] rounded-[inherit] border border-gold/25" />
          <span className="relative -translate-y-px font-serif">S</span>
        </span>
      )}

      {showWordmark && (
        <span className="flex min-w-0 flex-col leading-tight">
          {customName ? (
            <span
              className={cn(
                "truncate font-heading font-semibold",
                size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm",
                onDark ? "text-white" : "text-foreground",
              )}
            >
              {customName}
            </span>
          ) : (
            <>
              <span
                className={cn(
                  "font-medium uppercase tracking-[0.2em]",
                  nameSizes[size === "lg" ? "large" : size === "sm" ? "small" : "base"],
                  onDark ? "text-white/55" : "text-muted-foreground",
                )}
              >
                Sir Sahil&apos;s
              </span>
              <span
                className={cn(
                  "truncate font-heading font-semibold",
                  size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm",
                  onDark ? "text-white" : "text-foreground",
                )}
              >
                English Language Centre
              </span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
