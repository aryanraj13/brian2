"use client";

import { useState, useRef, useEffect } from "react";

type Source = { title: string; link: string };
type Message = {
  role: "user" | "assistant";
  text: string;
  sources?: { gmail: Source[]; drive: Source[] };
};

const SUGGESTIONS = [
  "Find the email from Stripe about the failed payment.",
  "What files have I recently edited in Drive?",
  "What jobs have I applied to, and what's my status on each?",
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: data.answer,
          sources: {
            gmail: data.debug?.gmailFactsUsed || [],
            drive: data.debug?.driveFactsUsed || [],
          },
        },
      ]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto flex flex-col h-screen p-4">
      <header className="py-4 border-b border-neutral-800">
        <h1 className="text-xl font-semibold">🧠 Personal Brain</h1>
        <p className="text-sm text-neutral-400">Ask about your Gmail + Drive.</p>
      </header>

      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-neutral-500 text-sm">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full text-left px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-sm text-neutral-300 border border-neutral-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 whitespace-pre-wrap text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-neutral-900 text-neutral-100"
              }`}
            >
              {m.text}
              {m.sources && (m.sources.gmail.length > 0 || m.sources.drive.length > 0) && (
                <div className="mt-2 pt-2 border-t border-neutral-700 text-xs text-neutral-400 space-y-1">
                  {m.sources.gmail.length > 0 && (
                    <div>
                      <span className="font-medium">Gmail sources:</span>{" "}
                      {m.sources.gmail.map((s) => s.title).join(", ")}
                    </div>
                  )}
                  {m.sources.drive.length > 0 && (
                    <div>
                      <span className="font-medium">Drive sources:</span>{" "}
                      {m.sources.drive.map((s) => s.title).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-neutral-900 rounded-2xl px-4 py-2 text-sm text-neutral-400">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="border-t border-neutral-800 pt-4 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your brain something..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium"
        >
          Send
        </button>
      </form>
    </main>
  );
}
