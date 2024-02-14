import { ImageResponse } from 'next/og';
import { NextRequest } from "next/server";
import htmlHandler from "../h/page";
import { RouteParams } from '../types';
import { loadFile } from '../load-file';


export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  const element = await htmlHandler({ params });
  const robotoMono400 = await loadFile('node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff');

  return new ImageResponse(element, {
    width: 1080,
    height: 566,
    emoji: 'noto',
    fonts: [{ name: 'Roboto_Mono_400', data: robotoMono400, weight: 400 }],
  });
}
