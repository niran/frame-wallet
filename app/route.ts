import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': "https://github.com/niran/frame-wallet/blob/main/README.md",
    },
  });
}
