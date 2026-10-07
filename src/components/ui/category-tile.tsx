import type { EventCategory } from "@/db/enums";
import { categoryLabel } from "@/lib/format";

import {
  BriefcaseIcon,
  CodeIcon,
  MicIcon,
  MusicIcon,
  SparkleIcon,
  TrophyIcon,
  WrenchIcon,
  type IconProps,
} from "./icons";

/**
 * Stand-in for event photography: events carry no image, so each category gets
 * its own yellow-to-blue gradient and icon.
 */
const TILES: Record<EventCategory, { icon: (props: IconProps) => React.ReactNode; gradient: string }> = {
  hackathon: {
    icon: CodeIcon,
    gradient: "linear-gradient(135deg, #ffd200 0%, #f0b400 34%, #1645a4 78%, #002a86 100%)",
  },
  workshop: {
    icon: WrenchIcon,
    gradient: "linear-gradient(160deg, #fff1a0 0%, #ffd200 30%, #3a64c2 85%, #0033a0 100%)",
  },
  cultural: {
    icon: MusicIcon,
    gradient: "linear-gradient(115deg, #ffcf00 0%, #ff9f1c 38%, #6a3fb5 80%, #24207a 100%)",
  },
  career_fair: {
    icon: BriefcaseIcon,
    gradient: "linear-gradient(200deg, #ffd200 0%, #e9bc08 25%, #2556b8 70%, #071f4d 100%)",
  },
  conference: {
    icon: MicIcon,
    gradient: "linear-gradient(145deg, #eef3ff 0%, #8fa9e0 35%, #0033a0 75%, #071f4d 100%)",
  },
  sports: {
    icon: TrophyIcon,
    gradient: "linear-gradient(125deg, #ffe45c 0%, #ffd200 30%, #1f8a70 75%, #0b4f6c 100%)",
  },
  other: {
    icon: SparkleIcon,
    gradient: "linear-gradient(150deg, #fff8cc 0%, #ffd200 40%, #4b6fc4 85%, #0033a0 100%)",
  },
};

type CategoryTileProps = {
  category: EventCategory;
  className?: string;
  /** Icon size class; larger tiles want a larger icon. */
  iconClassName?: string;
  children?: React.ReactNode;
};

export function CategoryTile({
  category,
  className = "h-40 rounded-2xl",
  iconClassName = "size-12",
  children,
}: CategoryTileProps) {
  const { icon: TileIcon, gradient } = TILES[category];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradient }}
      role="img"
      aria-label={`${categoryLabel(category)} event`}
    >
      <div className="pointer-events-none absolute -top-8 -right-8 size-36 rounded-full border-[2rem] border-white/10" />
      <div className="pointer-events-none absolute bottom-4 left-6 size-14 rounded-full bg-white/15 blur-xl" />
      <div className="hero-wave absolute inset-x-0 bottom-0 h-1/3" />
      <TileIcon
        className={`absolute right-5 bottom-4 text-white/85 drop-shadow ${iconClassName}`}
        strokeWidth={1.5}
      />
      {children ? <div className="relative h-full">{children}</div> : null}
    </div>
  );
}
