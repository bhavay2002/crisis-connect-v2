/**
 * SectionHeader — consistent page and section-level header.
 *
 * Usage:
 *   <SectionHeader title="Active Reports" />
 *   <SectionHeader title="Live Feed" description="Updates every 30s" badge={count} live />
 *   <SectionHeader title="Analytics" actions={<Button>Export</Button>} />
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TYPE } from "@/lib/tokens";
import { LiveIndicator } from "./LiveIndicator";
import { MOTION } from "@/lib/motion";

interface SectionHeaderProps {
  title:        string;
  description?: string;
  badge?:       number | string;
  live?:        boolean;
  actions?:     React.ReactNode;
  size?:        "sm" | "md" | "lg";
  className?:   string;
}

const TITLE_SIZE = {
  sm: "text-sm font-semibold",
  md: "text-base font-semibold",
  lg: "text-xl font-bold",
} as const;

export function SectionHeader({
  title,
  description,
  badge,
  live,
  actions,
  size      = "md",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-2 min-w-0">
        <h2 className={cn(TITLE_SIZE[size], "text-foreground leading-snug truncate")}>
          {title}
        </h2>

        {badge !== undefined && badge !== null && (
          <motion.span
            key={String(badge)}
            {...MOTION.springPop}
            className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums"
          >
            {badge}
          </motion.span>
        )}

        {live && <LiveIndicator size="sm" />}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {description && (
          <span className={cn(TYPE.caption, "hidden sm:block")}>{description}</span>
        )}
        {actions}
      </div>
    </div>
  );
}
