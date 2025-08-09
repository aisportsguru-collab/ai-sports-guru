import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_PREDICTION_API_URL}/predict/nfl`,
    );
    const data = await res.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch predictions" },
      { status: 500 },
    );
  }
}
