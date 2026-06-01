import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function PrivacyPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Privacy");

  const sections = [
    { title: t("dataCollection.title"), body: t("dataCollection.body") },
    { title: t("dataUsage.title"), body: t("dataUsage.body") },
    { title: t("dataStorage.title"), body: t("dataStorage.body") },
    { title: t("thirdParty.title"), body: t("thirdParty.body") },
    { title: t("retention.title"), body: t("retention.body") },
    { title: t("rights.title"), body: t("rights.body") },
    { title: t("contact.title"), body: t("contact.body") },
  ];

  return (
    <main className="mx-auto max-w-2xl px-6 py-24 sm:py-32">
      <h1 className="font-heading text-3xl font-bold text-primary sm:text-4xl">{t("heading")}</h1>
      <p className="mt-2 text-sm text-muted">{t("lastUpdated")}</p>
      <p className="mt-6 leading-relaxed text-secondary">{t("intro")}</p>

      {sections.map((section) => (
        <section key={section.title} className="mt-10">
          <h2 className="font-heading text-xl font-semibold text-primary">{section.title}</h2>
          <p className="mt-3 leading-relaxed text-secondary whitespace-pre-line">{section.body}</p>
        </section>
      ))}
    </main>
  );
}
