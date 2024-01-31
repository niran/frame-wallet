import { redirect } from 'next/navigation'

import { NextResponse } from 'next/server';


export async function POST(req, { params }) {
  const redirectPath = `/view-transaction/${params.txhash}/redirect`;

  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': redirectPath,
    },
  });
};
