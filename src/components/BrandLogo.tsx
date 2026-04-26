import logo from "@/assets/sgs-logo.webp";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "light" | "dark";
}

/**
 * SGS Consulting Group logo. The original logo is black on transparent,
 * so we invert it on dark backgrounds.
 */
export const BrandLogo = ({ className, variant = "light" }: Props) => {
  return (
    <img
      src={logo}
      alt="SGS Consulting Group"
      className={cn(
        "h-10 w-auto select-none",
        variant === "dark" && "invert brightness-0 contrast-100",
        className,
      )}
      draggable={false}
    />
  );
};
