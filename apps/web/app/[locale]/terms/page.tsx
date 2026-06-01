import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function TermsPage({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("Terms");

  const sections = [
    { title: t("eligibility.title"), body: t("eligibility.body") },
    { title: t("service.title"), body: t("service.body") },
    { title: t("accuracy.title"), body: t("accuracy.body") },
    { title: t("account.title"), body: t("account.body") },
    { title: t("ip.title"), body: t("ip.body") },
    { title: t("liability.title"), body: t("liability.body") },
    { title: t("changes.title"), body: t("changes.body") },
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
