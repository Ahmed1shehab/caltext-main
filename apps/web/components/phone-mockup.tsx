"use client";

type ChatMessage = { from: "user" | "bot"; text: string };

export function MiniChat({
  messages,
  className = "",
}: {
  messages: ChatMessage[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {messages.map((msg, i) => (
        <div
          key={`${msg.from}-${i}`}
          className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            msg.from === "user"
              ? "self-end bg-[#007AFF] text-white"
              : "self-start bg-[#E9E9EB] text-black dark:bg-[#2C2C2E] dark:text-white"
          }`}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}
