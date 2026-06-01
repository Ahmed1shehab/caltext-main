import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import { BottomCta } from "@/components/bottom-cta";
import { ChatShowcase } from "@/components/chat-showcase";
import { Faq } from "@/components/faq";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";

type Props = {
  params: Promise<{ locale: string }>;
};

export default function Home({ params }: Props) {
  const { locale } = use(params);
  setRequestLocale(locale);

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ChatShowcase />
        <Faq />
        <BottomCta />
      </main>
      <Footer />
    </>
  );
}
