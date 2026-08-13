import { NextRequest, NextResponse } from "next/server";
import { retrieveForQuestion } from "@/lib/retrieval";
import { synthesizeAnswer } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing 'question' string in body." }, { status: 400 });
    }

    const { gmailFacts, driveFacts, plan } = await retrieveForQuestion(question);
    const answer = await synthesizeAnswer(question, gmailFacts, driveFacts);

    return NextResponse.json({
      answer,
      // Returned for transparency / demo purposes — shows the cross-source retrieval working.
      debug: {
        plan,
        gmailFactsUsed: gmailFacts.map((f) => ({ title: f.title, link: f.link })),
        driveFactsUsed: driveFacts.map((f) => ({ title: f.title, link: f.link })),
      },
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Something went wrong." }, { status: 500 });
  }
}
