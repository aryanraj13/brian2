import { NextRequest, NextResponse } from "next/server";
import { synthesizeAnswerFromGbrainContext } from "@/lib/gemini";
import { retrieveForQuestion } from "@/lib/retrieval";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing 'question' string in body." },
        { status: 400 }
      );
    }

    const {
      gmailFacts,
      driveFacts,
      plan,
      gbrainContext,
    } = await retrieveForQuestion(question);

    if (!gbrainContext) {
      return NextResponse.json(
        {
          error:
            "GBrain could not retrieve any relevant information. Please try again.",
        },
        { status: 503 }
      );
    }

    const answer = await synthesizeAnswerFromGbrainContext(
      question,
      gbrainContext
    );

    return NextResponse.json({
      answer,

      debug: {
        retrievalEngine: "gbrain",
        searchMode: plan.searchMode,
        gmailFactsUsed: gmailFacts,
        driveFactsUsed: driveFacts,
      },
    });
  } catch (err: any) {
    console.error("[api/query]", err);

    return NextResponse.json(
      {
        error: err?.message || "Something went wrong.",
      },
      { status: 500 }
    );
  }
}