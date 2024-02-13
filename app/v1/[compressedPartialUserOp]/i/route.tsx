import { ImageResponse } from 'next/og';
import { NextRequest } from "next/server";
import htmlHandler from "../h/page";
import { RouteParams } from '../types';


export async function GET(req: NextRequest, { params }: { params: RouteParams }) {
  const element = await htmlHandler({ params });
  const fontUrl = new URL(
    '../../../../node_modules/@fontsource/roboto-mono/files/roboto-mono-latin-400-normal.woff',
    import.meta.url,
  );
  console.log(import.meta.url);
  console.log(fontUrl);
  const robotoMono400 = fetch(fontUrl).then((res) => res.arrayBuffer());

  return new ImageResponse(element, {
    width: 1080,
    height: 566,
    emoji: 'noto',
    fonts: [{ name: 'Roboto_Mono_400', data: await robotoMono400, weight: 400 }],
  });
}
