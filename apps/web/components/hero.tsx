"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { IMessageButton } from "./imessage-button";

const ALL_AVATARS = Array.from(
  { length: 7 },
  (_, i) => `https://cdn.caltext.ai/web/content/${i + 1}.jpg`,
);
const INITIAL_AVATARS = ALL_AVATARS.slice(4, 7);
const SWAP_INTERVAL = 4000;

function pickRandom(arr: string[], count: number): string[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function Hero() {
  const t = useTranslations("Hero");
  const [avatars, setAvatars] = useState<string[]>(INITIAL_AVATARS);

  const swap = useCallback(() => {
    setAvatars(pickRandom(ALL_AVATARS, 3));
  }, []);

  useEffect(() => {
    const initial = setTimeout(swap, 3000);
    const interval = setInterval(swap, 3000 + SWAP_INTERVAL);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [swap]);

  return (
    <section className="pt-32 pb-10 sm:pt-40 sm:pb-14">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="mb-8 -mt-2 flex items-center justify-center gap-3">
          <div className="flex -space-x-1.5" style={{ height: 28 }}>
            <AnimatePresence mode="popLayout">
              {avatars.map((src) => (
                <motion.img
                  key={src}
                  src={src}
                  alt=""
                  width={28}
                  height={28}
                  className="rounded-full border border-bg/80 object-cover"
                  style={{ width: 28, height: 28 }}
                  initial={{ opacity: 0, scale: 0.6, filter: "blur(4px) saturate(0.3)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px) saturate(0.3)" }}
                  exit={{ opacity: 0, scale: 0.6, filter: "blur(4px) saturate(0.3)" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              ))}
            </AnimatePresence>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-primary">
            {t("socialProof")}
          </span>
        </div>
        <h1 className="font-heading text-5xl leading-[0.98] font-bold tracking-tight text-primary sm:text-6xl md:text-7xl">
          {t("headline")}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-xl leading-[1.5] text-secondary">
          {t("subtitle")}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <IMessageButton short edgeIcon className="min-w-64 justify-center px-6" />
          <span className="text-[13px] text-muted">{t("trustLine")}</span>
        </div>
      </div>
    </section>
  );
}
