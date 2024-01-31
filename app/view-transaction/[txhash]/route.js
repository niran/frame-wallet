import { redirect } from 'next/navigation'

import { NextResponse } from 'next/server';


export async function POST(req, { params }) {
  const transactionUrl = `https://basescan.org/tx/${params.txhash}`;

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': transactionUrl,
    },
  });
};
