"use client";

import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { IMessageButton } from "./imessage-button";

const PHONE_NUMBER = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "+1XXXXXXXXXX";

export function BottomCta() {
  const t = useTranslations("BottomCta");
  const smsBody = useTranslations("IMessageButton")("smsBody");
  const smsHref = `sms:${PHONE_NUMBER}&body=${encodeURIComponent(smsBody)}`;

  return (
    <section id="get-started" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <div className="rounded-3xl border border-border bg-card px-8 py-14 text-center sm:px-16">
          <h2 className="font-heading text-3xl font-extrabold text-primary sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-secondary">{t("subtitle")}</p>

          <div className="mt-10 flex flex-col items-center gap-10 sm:flex-row sm:justify-center sm:gap-16">
            <div className="flex flex-col items-center gap-3">
              <IMessageButton short />
              <span className="text-[12px] text-muted">{t("buttonHint")}</span>
            </div>

            <div className="hidden h-24 w-px bg-border sm:block" />
            <div className="block h-px w-24 bg-border sm:hidden" />

            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl border border-border p-3">
                <QRCodeSVG
                  value={smsHref}
                  size={120}
                  level="M"
                  bgColor="#f6f4f1"
                  fgColor="#2c2825"
                />
              </div>
              <span className="text-[12px] text-muted">{t("qrLabel")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
