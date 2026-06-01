"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BellRing, Camera, ChartColumn } from "lucide-react";
import { useTranslations } from "next-intl";

export type ChatDemoScenario = "snapOrText" | "dailySummaries" | "smartReminders";

export const DEMO_STORIES: ReadonlyArray<{
  id: ChatDemoScenario;
  labelKey: "snapOrText.title" | "dailySummaries.title" | "smartReminders.title";
  Icon: LucideIcon;
}> = [
  {
    id: "snapOrText",
    labelKey: "snapOrText.title",
    Icon: Camera,
  },
  {
    id: "smartReminders",
    labelKey: "smartReminders.title",
    Icon: BellRing,
  },
  {
    id: "dailySummaries",
    labelKey: "dailySummaries.title",
    Icon: ChartColumn,
  },
];

export function ChatDemoRail({
  activeScenario,
  onSelect,
  className,
  size = "default",
}: {
  activeScenario: ChatDemoScenario;
  onSelect: (scenario: ChatDemoScenario) => void;
  className?: string;
  size?: "default" | "sm";
}) {
  const t = useTranslations("Features");
  const isSmall = size === "sm";

  return (
    <motion.div
      className={className}
      initial={{ y: 18, opacity: 0, scale: 0.96, filter: "blur(10px)" }}
      animate={{ y: 0, opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{
        type: "spring",
        stiffness: 220,
        damping: 24,
        mass: 0.95,
      }}
    >
      <div
        className={`pointer-events-auto flex max-w-[calc(100vw-1.5rem)] items-center overflow-x-auto rounded-[22px] border border-primary/5 bg-[rgba(237,234,230,0.95)] shadow-[0_10px_30px_rgba(44,40,37,0.06)] backdrop-blur-[18px] ${
          isSmall ? "gap-0 p-0.5" : "gap-1 p-1 sm:gap-1 sm:p-1.5"
        }`}
      >
        {DEMO_STORIES.map((story) => {
          const Icon = story.Icon;
          const isActive = activeScenario === story.id;

          return (
            <button
              key={story.id}
              type="button"
              onClick={() => onSelect(story.id)}
              className={`flex shrink-0 items-center rounded-[18px] transition-colors ${
                isSmall
                  ? "gap-1.5 px-2 py-1 font-sans text-xs"
                  : "gap-2 px-2.5 py-1.5 font-sans text-sm sm:px-3 sm:py-1.5"
              } ${isActive ? "bg-black/4 text-primary" : "text-secondary hover:text-primary"}`}
            >
              <Icon className={isSmall ? "size-3" : "size-4"} />
              <span className="whitespace-nowrap font-medium">{t(story.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
