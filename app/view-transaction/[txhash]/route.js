import { redirect } from 'next/navigation'

import { NextResponse } from 'next/server';


export async function POST(req, { params }) {
  const redirectPath = `/view-transaction/${params.txhash}/redirect`;
  const body = await req.json();
  console.log(JSON.stringify(body));
  
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': redirectPath,
    },
  });
};
