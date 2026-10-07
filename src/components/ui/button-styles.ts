/**
 * Button class names rather than a component, so the same look applies to a
 * `<Link>`, a form `<button>`, and a client `onClick` button alike.
 */

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-button text-sm font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";

const SIZES = {
  sm: "h-9 px-3.5",
  md: "h-11 px-5",
  lg: "h-12 px-6",
};

const VARIANTS = {
  primary: "bg-upay-yellow text-upay-navy shadow-button hover:bg-upay-yellow-deep",
  light: "bg-white text-upay-navy shadow-chip hover:bg-upay-yellow-soft",
  outline: "border border-upay-blue/15 bg-white/80 text-upay-navy hover:bg-upay-blue-soft",
  blue: "bg-upay-blue text-white shadow-card hover:bg-upay-navy",
};

export function buttonClass(
  variant: keyof typeof VARIANTS = "primary",
  size: keyof typeof SIZES = "md",
  extra = "",
): string {
  return `${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${extra}`.trim();
}
