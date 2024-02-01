import { NextResponse } from 'next/server';


export async function POST(req, { params }) {
  const transactionUrl = `https://basescan.org/tx/${params.txhash}`;
  try {
    const body = await req.json();
    console.log(JSON.stringify(body));
  } catch (e) { }
  
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': transactionUrl,
    },
  });
};

export const GET = POST;
