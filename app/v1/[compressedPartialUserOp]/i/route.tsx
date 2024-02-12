import { ImageResponse } from 'next/og';
import { NextRequest } from "next/server";
import htmlHandler from "../h/page";
import { RouteParams } from '../types';


export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  const element = await htmlHandler({ params });
  return new ImageResponse(element);
}
