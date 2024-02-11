import { NextResponse } from 'next/server';
import { BASE_URL } from '@/constants';


export async function POST(req, { params }) {
  const redirectPath = `${BASE_URL}/view-transaction/${params.txhash}/redirect`;
  try {
    const body = await req.json();
    console.log(JSON.stringify(body));
  } catch (e) { }
  
  return new NextResponse(null, {
    status: 302,
    headers: {
      'Location': redirectPath,
    },
  });
};

export const GET = POST;
