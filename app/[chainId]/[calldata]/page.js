const baseUrl = "https://frame-wallet.vercel.app";
const imageUrl = "/images/robot-check.png";

export default function Page({ params }) {
  return (
    <html>
      <head>
        <meta property="og:title" content="Frame Wallet Transaction" />
        <meta property="og:image" content={imageUrl} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${baseUrl}${imageUrl}`} />
        <meta property="fc:frame:button:1" content="Sign Transaction" />
        <meta property="fc:frame:post_url" content="https://faristocracy-frame.vercel.app/api/post?slide=1" />
      </head>
      <body>
        <img src={imageUrl} width="800" />
        <table>
          <tr>
            <td>Chain ID</td>
            <td>{params.chainId}</td>
          </tr>
          <tr>
            <td>Calldata</td>
            <td>0x{params.calldata}</td>
          </tr>
        </table>
      </body>
    </html>
  )
}
