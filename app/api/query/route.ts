import { NextRequest, NextResponse } from "next/server";
import {
  synthesizeAnswer,
  synthesizeAnswerFromGbrainContext,
} from "@/lib/gemini";
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

    let answer: string;

    if (gbrainContext) {
      answer = await synthesizeAnswerFromGbrainContext(
        question,
        gbrainContext
      );
    } else {
      answer = await synthesizeAnswer(
        question,
        gmailFacts,
        driveFacts
      );
    }

    return NextResponse.json({
      answer,

      debug: {
        retrievalEngine: gbrainContext ? "gbrain" : "sqlite",
        searchMode: plan.searchMode,
        gmailFactsUsed: gmailFacts.map((f) => ({
          title: f.title,
          link: f.link,
        })),
        driveFactsUsed: driveFacts.map((f) => ({
          title: f.title,
          link: f.link,
        })),
      },
    });
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        error: err.message || "Something went wrong.",
      },
      { status: 500 }
    );
  }
}