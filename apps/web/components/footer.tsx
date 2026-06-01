import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

function XIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M17.53 3H20.9l-7.36 8.41L22 21h-6.64l-5.2-6.05L4.86 21H1.48l7.87-8.99L2 3h6.8l4.7 5.52L17.53 3zm-1.18 16h1.87L7.78 4.9H5.77L16.35 19z"
        fill="currentColor"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.4 3c.33 1.82 1.43 3.23 3.1 4.04.8.4 1.67.62 2.5.66v3.18a8.3 8.3 0 01-3.82-.95v5.28a5.93 5.93 0 11-5.93-5.92c.33 0 .67.03.98.08v3.22a2.72 2.72 0 00-.98-.18 2.81 2.81 0 102.98 2.8V3h3.17z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("Footer");
  const socialLinks = [
    { href: "https://x.com/caltext", label: t("x"), Icon: XIcon },
    {
      href: "https://instagram.com/caltext",
      label: t("instagram"),
      Icon: InstagramIcon,
    },
    { href: "https://tiktok.com/@caltext", label: t("tiktok"), Icon: TikTokIcon },
  ] as const;

  return (
    <footer className="w-full border-t border-border py-10 sm:py-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 text-center">
        <div className="space-y-1">
          <div className="font-body text-lg font-semibold tracking-[-0.02em] text-primary">
            {t("logo")}
          </div>
          <p className="text-[13px] text-secondary">{t("tagline")}</p>
        </div>

        <div className="flex items-center gap-2">
          {socialLinks.map(({ href, label, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              aria-label={label}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-transparent text-secondary transition-colors hover:text-primary"
            >
              <Icon />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-5 text-[13px] text-muted">
          <Link href="/privacy" className="transition-colors hover:text-primary">
            {t("privacy")}
          </Link>
          <Link href="/terms" className="transition-colors hover:text-primary">
            {t("terms")}
          </Link>
        </div>

        <div className="text-center text-[12px] text-muted">
          {t("copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
