import { useTranslations } from "next-intl";

const STEP_KEYS = ["step1", "step2", "step3"] as const;

export function HowItWorks() {
  const t = useTranslations("HowItWorks");

  return (
    <section className="border-t border-border py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-heading text-3xl font-extrabold text-primary sm:text-4xl">
          {t("heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-secondary">{t("subtitle")}</p>

        <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEP_KEYS.map((key, i) => (
            <div key={key} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                {i + 1}
              </div>
              <h3 className="mt-4 font-heading text-lg font-bold text-primary">
                {t(`${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {t(`${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
