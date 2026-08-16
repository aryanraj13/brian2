import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LoginClient from "./LoginClient";
import DemoVideoButton from "./DemoVideoButton";

const FEATURES = [
  {
    number: "01",
    icon: "✉",
    title: "Gmail",
    description:
      "Search your emails, conversations, senders, and relevant attachments.",
  },
  {
    number: "02",
    icon: "◫",
    title: "Google Drive",
    description:
      "Find documents and files from your connected personal Drive.",
  },
  {
    number: "03",
    icon: "✦",
    title: "Cross-source reasoning",
    description:
      "Connect facts across sources and turn them into one grounded answer.",
  },
];

const STEPS = [
  {
    number: "01",
    title: "Connect",
    description: "Connect your personal data sources.",
  },
  {
    number: "02",
    title: "Sync",
    description: "Bring relevant Gmail and Drive data into your brain.",
  },
  {
    number: "03",
    title: "Ask",
    description: "Ask questions naturally, just like talking to an assistant.",
  },
  {
    number: "04",
    title: "Reason",
    description: "Your brain retrieves and combines the relevant facts.",
  },
];

const EXAMPLES = [
  "Find the email from Stripe about the failed payment.",
  "What files have I recently edited in Drive?",
  "What jobs have I applied to, and what's my status on each?",
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/chat");
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-300px] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-[120px]" />
        <div className="absolute bottom-[-300px] left-[-200px] h-[500px] w-[500px] rounded-full bg-purple-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl px-6 sm:px-8">
        {/* Navbar */}
        <nav className="flex h-20 items-center justify-between border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-lg">
              🧠
            </div>

            <span className="font-semibold tracking-tight">
              Personal Brain
            </span>
          </div>

          <DemoVideoButton />
        </nav>

        {/* Hero */}
        <section className="flex min-h-[680px] flex-col items-center justify-center text-center">
          <div className="mt-3 mb-7 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/[0.06] px-4 py-2 text-xs font-medium text-blue-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Personal AI knowledge system
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
            Your personal data,
            <br />
            <span className="text-neutral-500">made searchable.</span>
          </h1>

          <p className="mt-7 max-w-2xl text-base leading-7 text-neutral-400 sm:text-lg">
            Personal Brain lets you have a conversation with your Gmail and
            Google Drive. Ask a question, and get an answer grounded in your
            own data.
          </p>

          <div className="mt-9">
            <LoginClient />
          </div>

          <p className="mt-4 text-xs text-neutral-600">
            Secure authentication with Google
          </p>

          {/* Mini product preview */}
          <div className="mt-16 w-full max-w-3xl rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2 shadow-2xl shadow-black/30">
            <div className="rounded-xl border border-white/[0.06] bg-[#0d0d0f]">
              <div className="flex h-11 items-center border-b border-white/[0.06] px-4">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
                </div>

                <span className="ml-auto mr-auto text-xs text-neutral-600">
                  Personal Brain
                </span>
              </div>

              <div className="px-5 py-10 text-left sm:px-10">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sm">
                    🧠
                  </div>

                  <div>
                    <p className="text-xs text-neutral-600">Personal Brain</p>
                    <p className="mt-1 max-w-xl text-sm leading-6 text-neutral-300">
                      I can search across your connected data sources and
                      combine relevant information into one answer.
                    </p>
                  </div>
                </div>

                <div className="ml-auto max-w-md rounded-xl border border-white/[0.06] bg-white/[0.035] px-4 py-3 text-sm text-neutral-400">
                  What jobs have I applied to, and what&apos;s my status on
                  each?
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* How it works */}
        <section className="mt-7 border-t border-white/[0.06] py-24">
          <div className="mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
              How it works
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From your data to an answer.
            </h2>
          </div>

          <div className="grid gap-0 md:grid-cols-4">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className="relative border-l border-white/[0.08] py-2 pl-6 pr-6 first:border-l-0 md:min-h-[180px]"
              >
                <span className="text-xs font-medium text-neutral-600">
                  {step.number}
                </span>

                <h3 className="mt-6 font-semibold">{step.title}</h3>

                <p className="mt-2 text-sm leading-6 text-neutral-500">
                  {step.description}
                </p>

                {index < STEPS.length - 1 && (
                  <span className="absolute right-[-5px] top-3 hidden h-2 w-2 rounded-full border border-neutral-700 bg-[#09090b] md:block" />
                )}
              </div>
            ))}
          </div>
        </section>


        {/* CTA */}
        <section className="border-t border-white/[0.06] py-28 text-center">
          <div className="mx-auto max-w-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04]">
              🧠
            </div>

            <h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
              Start talking to your data.
            </h2>

            <p className="mt-4 text-neutral-500">
              Connect with Google and open your Personal Brain.
            </p>

            <div className="mt-8 flex justify-center">
              <LoginClient />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-3 border-t border-white/[0.06] py-8 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Personal Brain</span>

          <span>
            Gmail · Google Drive · Gemini · gbrain
          </span>
        </footer>
      </div>
    </main>
  );
}