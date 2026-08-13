import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { syncPersonalData } from "@/lib/sync";

export const runtime = "nodejs";

let syncInProgress = false;

export async function POST() {
  try {
    // Make sure the user is logged in.
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    // Prevent two syncs from running simultaneously.
    if (syncInProgress) {
      return NextResponse.json(
        {
          success: false,
          error: "A sync is already in progress.",
        },
        {
          status: 409,
        },
      );
    }

    syncInProgress = true;

    const result = await syncPersonalData();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while syncing.",
      },
      {
        status: 500,
      },
    );
  } finally {
    syncInProgress = false;
  }
}