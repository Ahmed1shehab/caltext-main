import { useTranslations } from "next-intl";
import { MiniChat } from "./phone-mockup";

type ChatMessage = { from: "user" | "bot"; text: string };

const FEATURE_KEYS = ["snapOrText", "dailySummaries", "smartReminders"] as const;

export function Features() {
  const t = useTranslations("Features");

  const chatMessages: Record<string, ChatMessage[]> = {
    snapOrText: [
      { from: "user", text: t("chat.snapOrText.user1") },
      { from: "bot", text: t("chat.snapOrText.bot1") },
    ],
    dailySummaries: [{ from: "bot", text: t("chat.dailySummaries.bot1") }],
    smartReminders: [
      { from: "bot", text: t("chat.smartReminders.bot1") },
      { from: "user", text: t("chat.smartReminders.user1") },
    ],
  };

  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-center font-heading text-3xl font-extrabold text-primary sm:text-4xl">
          {t("heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-secondary">{t("subtitle")}</p>

        <div className="mt-14 grid gap-6">
          {FEATURE_KEYS.map((key) => (
            <div key={key} className="rounded-2xl border border-border bg-bg p-6">
              <h3 className="font-heading text-xl font-bold text-primary">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                {t(`${key}.description`)}
              </p>
              <MiniChat messages={chatMessages[key] ?? []} className="mt-5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
