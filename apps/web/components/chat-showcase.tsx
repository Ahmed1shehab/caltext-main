"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatDemoRail, DEMO_STORIES } from "@/components/chat-demo-rail";
import { type ChatDemoScenario, ChatIMessageAnimation } from "./animations/chat-demo";
import { IPhoneMock } from "./iphone-mock";

const PHONE_W = 418;
const PHONE_H = 890;
const MOBILE_SCALE = 0.64;
const DESKTOP_SCALE = 0.82;
const MOBILE_FRAME_GUTTER = 8;
const DESKTOP_FRAME_GUTTER = 26;
const MOBILE_PHONE_MIN_SCALE = 0.44;
const MOBILE_PHONE_SAFE_X = 24;
const MOBILE_PHONE_SAFE_Y = 120;

const DESKTOP_PHONE_H = Math.round(PHONE_H * DESKTOP_SCALE) + DESKTOP_FRAME_GUTTER;

export function ChatShowcase() {
  const [mounted, setMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileScale, setMobileScale] = useState(MOBILE_SCALE);
  const [mobileScenarioIndex, setMobileScenarioIndex] = useState(0);
  const [mobilePlaying, setMobilePlaying] = useState(true);
  const [mobileStartAtEnd, setMobileStartAtEnd] = useState(false);
  const [activeScenario, setActiveScenario] = useState<ChatDemoScenario>("snapOrText");
  const [demoActive, setDemoActive] = useState(false);
  const [hasExitedDemo, setHasExitedDemo] = useState(false);
  const [stickyTop, setStickyTop] = useState(12);

  const mobilePauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRefs = useRef<Partial<Record<ChatDemoScenario, HTMLElement | null>>>({});
  const demoSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const updateMobileScale = () => {
      setIsMobileViewport(window.innerWidth < 1024);

      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

      setStickyTop(Math.max(12, Math.round((viewportHeight - DESKTOP_PHONE_H) / 2)));
      const availableWidth = viewportWidth - MOBILE_PHONE_SAFE_X - MOBILE_FRAME_GUTTER * 2;
      const availableHeight = viewportHeight - MOBILE_PHONE_SAFE_Y - MOBILE_FRAME_GUTTER;

      const widthScale = availableWidth / PHONE_W;
      const heightScale = availableHeight / PHONE_H;

      setMobileScale(
        Math.max(MOBILE_PHONE_MIN_SCALE, Math.min(MOBILE_SCALE, widthScale, heightScale)),
      );
    };

    updateMobileScale();
    window.addEventListener("resize", updateMobileScale);
    window.visualViewport?.addEventListener("resize", updateMobileScale);
    window.visualViewport?.addEventListener("scroll", updateMobileScale);

    return () => {
      window.removeEventListener("resize", updateMobileScale);
      window.visualViewport?.removeEventListener("resize", updateMobileScale);
      window.visualViewport?.removeEventListener("scroll", updateMobileScale);
    };
  }, []);

  const handleMobileComplete = useCallback(() => {
    setMobilePlaying(false);
    setMobileStartAtEnd(false);

    mobilePauseTimerRef.current = setTimeout(() => {
      setMobileScenarioIndex((prev) => (prev + 1) % DEMO_STORIES.length);
      setMobilePlaying(true);
      mobilePauseTimerRef.current = null;
    }, 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (mobilePauseTimerRef.current !== null) {
        clearTimeout(mobilePauseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      setDemoActive(false);
      setHasExitedDemo(false);
      return;
    }

    const handleScroll = () => {
      const section = demoSectionRef.current;
      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const isPhoneSticky = rect.top <= stickyTop && rect.bottom >= window.innerHeight * 0.25;
      setDemoActive(isPhoneSticky);
      setHasExitedDemo(rect.bottom <= window.innerHeight + 16);

      const viewportAnchor = window.innerHeight * 0.5;
      let closestScenario = DEMO_STORIES[0]?.id ?? "snapOrText";
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const story of DEMO_STORIES) {
        const node = sectionRefs.current[story.id];
        if (!node) {
          continue;
        }

        const storyRect = node.getBoundingClientRect();
        const distance =
          viewportAnchor < storyRect.top
            ? storyRect.top - viewportAnchor
            : viewportAnchor > storyRect.bottom
              ? viewportAnchor - storyRect.bottom
              : 0;

        if (distance < closestDistance) {
          closestDistance = distance;
          closestScenario = story.id;
        }
      }

      setActiveScenario(closestScenario);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isMobileViewport, stickyTop]);

  const mobileScenario = DEMO_STORIES[mobileScenarioIndex]?.id ?? "snapOrText";

  const selectMobileScenario = useCallback((scenario: ChatDemoScenario) => {
    if (mobilePauseTimerRef.current !== null) {
      clearTimeout(mobilePauseTimerRef.current);
      mobilePauseTimerRef.current = null;
    }

    const nextIndex = DEMO_STORIES.findIndex((story) => story.id === scenario);
    if (nextIndex >= 0) {
      setMobileStartAtEnd(false);
      setMobileScenarioIndex(nextIndex);
      setMobilePlaying(true);
    }
  }, []);

  const scrollToScenario = useCallback((scenario: ChatDemoScenario) => {
    sectionRefs.current[scenario]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  return (
    <section id="features" className="-mt-4 pb-16 sm:-mt-6 sm:pb-20">
      {mounted && isMobileViewport ? (
        <section className="relative pb-6 pt-0 lg:hidden">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-5 px-4">
            <div
              className="relative flex w-full justify-center"
              style={{
                height: Math.round(PHONE_H * mobileScale) + MOBILE_FRAME_GUTTER,
              }}
            >
              <div
                className="relative"
                style={{
                  width: Math.round(PHONE_W * mobileScale) + MOBILE_FRAME_GUTTER * 2,
                  height: Math.round(PHONE_H * mobileScale) + MOBILE_FRAME_GUTTER,
                }}
              >
                <div
                  className="absolute top-0 origin-top-left"
                  style={{
                    left: MOBILE_FRAME_GUTTER,
                    transform: `scale(${mobileScale})`,
                  }}
                >
                  <IPhoneMock>
                    <ChatIMessageAnimation
                      key={mobileScenario}
                      scenario={mobileScenario}
                      playing={mobilePlaying}
                      startAtEnd={mobileStartAtEnd}
                      onComplete={handleMobileComplete}
                    />
                  </IPhoneMock>
                </div>
              </div>
            </div>

            <ChatDemoRail
              activeScenario={mobileScenario}
              onSelect={selectMobileScenario}
              size="sm"
            />
          </div>
        </section>
      ) : null}

      {mounted && !isMobileViewport ? (
        <section ref={demoSectionRef} className="relative hidden pt-0 lg:block">
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative">
              <div
                className="sticky z-10 flex flex-col items-center gap-5"
                style={{ top: stickyTop }}
              >
                <div
                  className="relative"
                  style={{
                    width: Math.round(PHONE_W * DESKTOP_SCALE) + DESKTOP_FRAME_GUTTER * 2,
                    height: Math.round(PHONE_H * DESKTOP_SCALE) + DESKTOP_FRAME_GUTTER,
                  }}
                >
                  <div
                    className="absolute top-0 origin-top-left"
                    style={{
                      left: DESKTOP_FRAME_GUTTER,
                      transform: `scale(${DESKTOP_SCALE})`,
                    }}
                  >
                    <IPhoneMock>
                      <ChatIMessageAnimation
                        key={activeScenario}
                        scenario={activeScenario}
                        playing={demoActive}
                      />
                    </IPhoneMock>
                  </div>
                </div>

                {hasExitedDemo ? (
                  <ChatDemoRail
                    activeScenario={activeScenario}
                    onSelect={scrollToScenario}
                    className="flex justify-center px-3 sm:px-4 lg:px-6"
                  />
                ) : null}
              </div>

              <div className="pointer-events-none relative -mt-[62vh] pb-18 pt-[55vh]">
                {DEMO_STORIES.map((story) => (
                  <article
                    key={story.id}
                    ref={(node) => {
                      sectionRefs.current[story.id] = node;
                    }}
                    className="min-h-[95vh]"
                    style={{ scrollMarginTop: 120 }}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {mounted && !isMobileViewport && !hasExitedDemo ? (
        <ChatDemoRail
          activeScenario={activeScenario}
          onSelect={scrollToScenario}
          className="hidden lg:flex fixed inset-x-0 bottom-4 z-50 justify-center px-3 sm:px-4 lg:px-6"
        />
      ) : null}
    </section>
  );
}
