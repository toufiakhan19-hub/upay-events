type PillProps = {
  children: React.ReactNode;
  tone?: "blue" | "yellow" | "white";
  className?: string;
};

const TONES = {
  blue: "bg-upay-blue-soft text-upay-navy",
  yellow: "bg-upay-yellow text-upay-navy shadow-active",
  white: "bg-white/90 text-upay-navy backdrop-blur-md",
};

export function Pill({ children, tone = "blue", className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
