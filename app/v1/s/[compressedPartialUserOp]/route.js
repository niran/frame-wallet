import { NextResponse } from "next/server";
import { BASE_URL } from "../../../../constants";

const IMAGE_URL = "/images/robot-check.png";


export async function POST(req, { params }) {
  let body;
  try {
    body = await req.json();
    console.log(JSON.stringify(body));
  } catch (e) { }
  
  const html = `
    <html>
      <head>
        <meta property="og:title" content="Frame Wallet Transaction" />
        <meta property="og:image" content="${IMAGE_URL}" />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${BASE_URL}${IMAGE_URL}" />
        <meta property="fc:frame:button:1" content="View My Transactions" />
        <meta property="fc:frame:button:1:action" content="post_redirect" />
        <meta property="fc:frame:button:2" content="View My Frame Wallet" />
        <meta property="fc:frame:button:2:action" content="post_redirect" />
        <meta property="fc:frame:post_url" content="${BASE_URL}/view-transaction/0x17e7e2c5fd01cbaf7f3564effbb0dac32303bb04cf695388068790dcf518ca3a" />
      </head>
      <body>
        <img src="${IMAGE_URL}" width="800" />
        <table>
          <tr>
            <td>Compressed Partial UserOp</td>
            <td>${params.compressedPartialUserOp}</td>
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
