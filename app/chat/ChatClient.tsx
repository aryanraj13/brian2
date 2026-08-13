"use client";

import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useRef, useState } from "react";

type Source = {
  title: string;
  link: string;
};

type Message = {
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  sources?: {
    gmail: Source[];
    drive: Source[];
  };
};

type Props = {
  session: Session;
};

const SUGGESTIONS = [
  {
    title: "Search Gmail",
    question: "Find the email from Stripe about the failed payment.",
    icon: "✉",
    source: "Gmail",
  },
  {
    title: "Search Drive",
    question: "What files have I recently edited in Drive?",
    icon: "◫",
    source: "Drive",
  },
  {
    title: "Cross-source",
    question:
      "What jobs have I applied to, and what's my status on each, including my take-home submission?",
    icon: "✦",
    source: "Gmail + Drive",
  },
];

export default function ChatClient({ session }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
const [syncMessage, setSyncMessage] = useState("");
const [syncError, setSyncError] = useState("");
  const [showProfile, setShowProfile] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const firstName =
    session.user?.name?.split(" ")[0] ||
    session.user?.name ||
    "there";

  const initials =
    session.user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfile(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleSync() {
    if (syncing) return;
  
    setSyncing(true);
    setSyncMessage("");
    setSyncError("");
  
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Sync failed.");
      }
  
      if (data.gbrain?.success) {
        setSyncMessage(
          `Synced ${data.gmailCount} Gmail facts and ${data.driveCount} Drive facts.`,
        );
      } else if (data.gbrain?.skipped) {
        setSyncMessage(
          `Synced ${data.gmailCount} Gmail facts and ${data.driveCount} Drive facts. gbrain was skipped.`,
        );
      } else {
        setSyncMessage(
          `Gmail and Drive synced, but gbrain import did not complete.`,
        );
      }
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "Something went wrong while syncing.",
      );
    } finally {
      setSyncing(false);
    }
  }


  async function ask(question: string) {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: trimmedQuestion,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: data.answer,
          sources: {
            gmail: data.debug?.gmailFactsUsed || [],
            drive: data.debug?.driveFactsUsed || [],
          },
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong.";
    
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: message,
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(input);
  }

  function handleSuggestion(question: string) {
    ask(question);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#09090b] text-white">
      {/* Navbar */}
      <header className="shrink-0 border-b border-white/[0.07] bg-[#09090b]/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-lg">
              🧠
            </div>

            <div>
              <h1 className="text-sm font-semibold tracking-tight sm:text-base">
                Personal Brain
              </h1>

              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-600">
  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
  Gmail + Google Drive
</p>
            </div>
            <div>
            <button
  type="button"
  onClick={() => {
    setMessages([]);
    setInput("");
    setSyncMessage("");
    setSyncError("");
    inputRef.current?.focus();
  }}
  className="ml-2 flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs text-neutral-500 transition hover:border-white/[0.12] hover:bg-white/[0.04] hover:text-neutral-300"
  title="Start a new conversation"
>
  <span>＋</span>
  <span className="hidden sm:inline">New chat</span>
</button>
            </div>
          </div>
          

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sync */}
            <button
  type="button"
  onClick={handleSync}
  disabled={syncing}
  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-2 text-xs font-medium text-neutral-300 transition hover:border-white/[0.15] hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  <span
    className={`text-sm ${syncing ? "animate-spin" : ""}`}
  >
    ↻
  </span>

  <span className="hidden sm:inline">
    {syncing ? "Syncing..." : "Sync"}
  </span>
</button>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfile((value) => !value)}
                className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 transition hover:bg-white/[0.05]"
              >
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-medium text-neutral-200">
                    {session.user?.name}
                  </p>

                  <p className="mt-0.5 max-w-[190px] truncate text-[11px] text-neutral-600">
                    {session.user?.email}
                  </p>
                </div>

                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "User"}
                    className="h-9 w-9 rounded-full border border-white/[0.1]"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.07] text-xs font-semibold text-neutral-300">
                    {initials}
                  </div>
                )}

                <span className="hidden text-xs text-neutral-600 sm:block">
                  ▾
                </span>
              </button>

              {/* Profile dropdown */}
              {showProfile && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] shadow-2xl shadow-black/40">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="text-sm font-medium text-white">
                      {session.user?.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-neutral-500">
                      {session.user?.email}
                    </p>
                  </div>

                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        signOut({
                          callbackUrl: "/",
                        })
                      }
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-400 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <span>↪</span>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Chat area */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 sm:px-8">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center py-16">
              <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-2xl shadow-xl shadow-black/20">
                🧠
              </div>

              <h2 className="text-3xl font-semibold tracking-tight">
                How can I help, {firstName}?
              </h2>

              <p className="mt-3 max-w-md text-center text-sm leading-6 text-neutral-500">
                Ask questions about your Gmail and Google Drive. Your brain
                will find the relevant information and reason across sources.
              </p>

              {/* Suggestions */}
              <div className="mt-10 grid w-full gap-3 sm:grid-cols-3">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.question}
                    type="button"
                    onClick={() => handleSuggestion(suggestion.question)}
                    className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.13] hover:bg-white/[0.035]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-sm">
                        {suggestion.icon}
                      </span>

                      <span className="text-neutral-700 transition group-hover:text-neutral-400">
                        →
                      </span>
                    </div>

                    <p className="mt-4 text-xs font-medium text-neutral-300">
                      {suggestion.title}
                    </p>

                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-neutral-600">
                      {suggestion.question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="flex-1 py-8 sm:py-10">
              <div className="space-y-8">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    {message.role === "user" ? (
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.08] px-4 py-3 text-sm leading-6 text-neutral-200">
                        {message.text}
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm">
                            🧠
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="mb-2 text-xs font-medium text-neutral-600">
                              Personal Brain
                            </p>

                            <div
  className={`whitespace-pre-wrap text-sm leading-7 ${
    message.error
      ? "text-red-400"
      : "text-neutral-300"
  }`}
>
  {message.error && "⚠ "}
  {message.text}
</div>

                            {/* Sources */}
                            {message.sources &&
  (message.sources.gmail.length > 0 ||
    message.sources.drive.length > 0) && (
    <div className="mt-6 border-t border-white/[0.06] pt-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-600">
          Sources used
        </p>

        <p className="text-[10px] text-neutral-700">
          {message.sources.gmail.length +
            message.sources.drive.length}{" "}
          source
          {message.sources.gmail.length +
            message.sources.drive.length !==
          1
            ? "s"
            : ""}
        </p>
      </div>

      <div className="space-y-2">
        {message.sources.gmail.map((source, sourceIndex) => (
          <a
            key={`gmail-${sourceIndex}`}
            href={source.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-red-400/20 hover:bg-red-400/[0.025]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-400/[0.08] text-sm text-red-400">
              ✉
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-red-400/70">
                Gmail
              </p>

              <p className="mt-0.5 truncate text-xs text-neutral-400 group-hover:text-neutral-200">
                {source.title}
              </p>
            </div>

            <span className="text-neutral-700 transition group-hover:text-neutral-400">
              ↗
            </span>
          </a>
        ))}

        {message.sources.drive.map((source, sourceIndex) => (
          <a
            key={`drive-${sourceIndex}`}
            href={source.link || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-blue-400/20 hover:bg-blue-400/[0.025]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-400/[0.08] text-sm text-blue-400">
              ◫
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-blue-400/70">
                Google Drive
              </p>

              <p className="mt-0.5 truncate text-xs text-neutral-400 group-hover:text-neutral-200">
                {source.title}
              </p>
            </div>

            <span className="text-neutral-700 transition group-hover:text-neutral-400">
              ↗
            </span>
          </a>
        ))}
      </div>
    </div>
  )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Thinking */}
                {loading && (
  <div className="flex justify-start">
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-sm">
        🧠
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-neutral-600">
          Personal Brain
        </p>

        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
          <span className="text-xs text-neutral-500">
            Searching your brain...
          </span>
        </div>
      </div>
    </div>
  </div>
)}

                <div ref={bottomRef} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 pb-5 pt-3 sm:px-8 sm:pb-7">
        <div className="mx-auto max-w-3xl">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-2xl border border-white/[0.1] bg-white/[0.035] shadow-2xl shadow-black/20 transition focus-within:border-white/[0.18]"
          >
            {(syncMessage || syncError) && (
  <div className="mb-3 flex justify-center">
    {syncError ? (
      <div className="rounded-lg border border-red-400/10 bg-red-400/[0.05] px-3 py-2 text-xs text-red-400">
        ⚠ {syncError}
      </div>
    ) : (
      <div className="rounded-lg border border-green-400/10 bg-green-400/[0.05] px-3 py-2 text-xs text-green-400">
        ✓ {syncMessage}
      </div>
    )}
  </div>
)}
            <input
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={loading}
              placeholder="Ask your brain something..."
              className="w-full bg-transparent px-5 pb-14 pt-4 text-sm text-white outline-none placeholder:text-neutral-600 disabled:opacity-50"
            />

            <div className="absolute bottom-3 left-4 text-[11px] text-neutral-700">
              Personal Brain searches Gmail + Drive
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-neutral-600"
              aria-label="Send message"
            >
              ↑
            </button>
          </form>

          <p className="mt-2 text-center text-[10px] text-neutral-700">
            Personal Brain can make mistakes. Verify important information
            against the original source.
          </p>
        </div>
      </div>
    </main>
  );
}