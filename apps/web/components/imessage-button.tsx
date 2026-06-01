import { useTranslations } from "next-intl";

const PHONE_NUMBER = process.env.NEXT_PUBLIC_PHONE_NUMBER ?? "+1XXXXXXXXXX";

export function IMessageButton({
  className = "",
  short = false,
  compact = false,
  showIcon = true,
  edgeIcon = false,
}: {
  className?: string;
  short?: boolean;
  compact?: boolean;
  showIcon?: boolean;
  edgeIcon?: boolean;
}) {
  const t = useTranslations("IMessageButton");
  const smsHref = `sms:${PHONE_NUMBER}&body=${encodeURIComponent(t("smsBody"))}`;

  return (
    <a
      href={smsHref}
      className={`relative inline-flex items-center gap-3 border border-primary/70 bg-[linear-gradient(180deg,#3a3633_0%,#2c2825_100%)] text-center text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_24px_rgba(255,255,255,0.04),0_6px_16px_rgba(0,0,0,0.22)] transition-transform duration-150 hover:scale-[1.01] hover:bg-[linear-gradient(180deg,#443f3b_0%,#352f2c_100%)] ${compact ? "min-h-10 rounded-[14px] px-3.5 py-1.5" : "min-h-14 rounded-[18px] py-2 pr-4.5 pl-3"} ${className}`}
    >
      {showIcon ? (
        <span
          className={`flex shrink-0 items-center justify-center bg-[linear-gradient(180deg,#44e35e_0%,#27c93f_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_18px_rgba(52,199,89,0.35)] ${compact ? "h-7.5 w-7.5 rounded-[9px]" : "h-8 w-8 rounded-[10px]"} ${edgeIcon ? "absolute left-3 top-1/2 -translate-y-1/2" : ""}`}
        >
          <svg
            width={compact ? "16" : "17"}
            height={compact ? "16" : "17"}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2C6.477 2 2 5.813 2 10.5c0 2.65 1.42 5.015 3.636 6.593-.19 1.14-.694 2.691-1.636 3.907 2.104-.174 3.856-1.024 4.964-1.794.97.19 1.986.294 3.036.294C17.523 19.5 22 15.687 22 10.5S17.523 2 12 2z"
              fill="white"
            />
          </svg>
        </span>
      ) : null}
      <span
        className={`flex min-w-0 items-center justify-center font-heading font-semibold tracking-[-0.02em] text-white ${showIcon ? (compact ? "pr-0.5 text-[0.84rem]" : "pr-0.5 text-[0.94rem]") : compact ? "px-2.5 text-[0.84rem]" : "px-4 text-[0.94rem]"} ${edgeIcon ? "w-full px-10" : ""}`}
      >
        {short ? t("shortLabel") : t("label")}
      </span>
    </a>
  );
}
