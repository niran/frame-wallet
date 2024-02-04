import { BASE_URL } from "../../constants";

const imageUrl = "/images/robot-check.png";

export default function Page({ params }) {
  const [chainId, calldata, ] = decodeURIComponent(params.transactionInfo).split(':');
  return (
    <html>
      <head>
        <meta property="og:title" content="Frame Wallet Transaction" />
        <meta property="og:image" content={imageUrl} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={`${BASE_URL}${imageUrl}`} />
        <meta property="fc:frame:button:1" content="Sign Transaction" />
        <meta property="fc:frame:post_url" content={`${BASE_URL}/${chainId}/${calldata}/sign`} />
      </head>
      <body>
        <img src={imageUrl} width="800" />
        <table>
          <tr>
            <td>Chain ID</td>
            <td>{chainId}</td>
          </tr>
          <tr>
            <td>Calldata</td>
            <td>{calldata}</td>
          </tr>
        </table>
      </body>
    </html>
  )
}
