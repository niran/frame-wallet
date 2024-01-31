import { redirect } from 'next/navigation'

import { NextResponse } from 'next/server';


export async function POST(req, { params }) {
  const transactionUrl = `https://basescan.org/tx/${params.txhash}`;
  const body = await req.json();
  console.log(JSON.stringify(body));
  
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': transactionUrl,
    },
  });
};
