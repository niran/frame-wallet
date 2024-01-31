import { NextResponse } from "next/server";

const baseUrl = "https://frame-wallet.vercel.app";
const imageUrl = "/images/robot-check.png";


export async function POST(req, { params }) {
  const body = await req.json();
  const html = `
    <html>
      <head>
        <meta property="og:title" content="Frame Wallet Transaction" />
        <meta property="og:image" content="${imageUrl}" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${baseUrl}${imageUrl}" />
        <meta property="fc:frame:button:1" content="View Transaction" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:post_url" content="${baseUrl}/view-transaction/0x17e7e2c5fd01cbaf7f3564effbb0dac32303bb04cf695388068790dcf518ca3a" />
      </head>
      <body>
        <img src="${imageUrl}" width="800" />
        <table>
          <tr>
            <td>Chain ID</td>
            <td>${params.chainId}</td>
          </tr>
          <tr>
            <td>Calldata</td>
            <td>${params.calldata}</td>
          </tr>
          <tr>
            <td>POST body</td>
            <td><pre>${JSON.stringify(body, null, 2)}</pre></td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
};
