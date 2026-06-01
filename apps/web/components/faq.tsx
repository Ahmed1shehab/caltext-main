"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const FAQ_KEYS = ["1", "2", "3", "4", "5"] as const;

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
      >
        <span className="pr-4 text-[15px] font-medium text-primary">{q}</span>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-45" : ""
          }`}
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-sm leading-relaxed text-secondary">{a}</p>
        </div>
      </div>
    </div>
  );
}

export function Faq() {
  const t = useTranslations("Faq");

  return (
    <section id="faqs" className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-center font-heading text-3xl font-extrabold text-primary sm:text-4xl">
          {t("heading")}
        </h2>
        <div className="mt-12">
          {FAQ_KEYS.map((key) => (
            <FaqItem key={key} q={t(`q${key}`)} a={t(`a${key}`)} />
          ))}
        </div>
      </div>
    </section>
  );
}
