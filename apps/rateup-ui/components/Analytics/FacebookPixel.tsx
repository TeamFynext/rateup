import Script from "next/script";

import { FB_PIXEL_ID } from "../../utils/fbpixel";

const FacebookPixel = () => {
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}`}
      />
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('consent', 'revoke');
        fbq('init', ${FB_PIXEL_ID});
        fbq('track', 'PageView');
      `,
        }}
      />
    </>
  );
};
export default FacebookPixel;
