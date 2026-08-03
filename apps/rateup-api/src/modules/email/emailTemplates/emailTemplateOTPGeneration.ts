import { rateupLogo } from "../../../utils/constants/constants.js";

// Only `surveyName` and `otp` are read here.
export function createEmailBodyOTPGeneration(data: EmailTemplateData | undefined) {
  return `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>email</title>
      <style>
        @media screen {
          @font-face {
            font-family: "Lexend";
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url(https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WCzsWzLdneg.woff2)
              format("woff2");
          }
        }
        body {
          font-family: "Lexend";
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
  
        .frame {
          background-color: #f7f7f7;
          border-radius: 27px;
          padding: clamp(0.938rem, -0.848rem + 4.762vw, 3.438rem);
        }
  
        .overlap-group {
          border-radius: 23px;
        }
  
        .email-title {
          color: #0a000d;
          font-size: 28px;
          font-style: normal;
          font-weight: 400;
          line-height: normal;
          padding-top: 40px;
        }
  
        .email-body {
          color: #000;
          font-size: 18px;
          font-style: normal;
          font-weight: 400;
          line-height: normal;
        }
  
        .thanks {
          color: #0a000d;
          font-size: 18px;
          font-style: normal;
          font-weight: 400;
          line-height: normal;
        }

        .rateup-logo {
          width: 134px;
          height: 128px;
          margin-top: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        td,
        th {
          text-align: center;
          padding: 10px;
        },
        .otp-text {
          letter-spacing: 6px
        }
      </style>
    </head>
    <body style="max-width: 1000px;font-family: 'Lexend', sans-serif;">
      <div class="frame">
        <div class="overlap-group">
          <table aria-describedby="email content">
            <thead>
              <tr>
                <th>
                  <img
                    class="rateup-logo"
                      src="${rateupLogo}"
                      alt="Rateup Logo"
                      width="134"
                      height="128"
                    />
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <p class="email-body" style="max-width: 500px;">
                   To continue ${data?.surveyName}, please use the following One Time Password(OTP)
                  </p>
                </td>
              </tr>
              <tr>
               <td style="max-width: 500px; text-align: center; margin: 0 auto;">
                 <h2 class="otp-text">${data?.otp}</h2>
               </td>
              </tr>
              <tr><td></td></tr>
              <tr>
                <td>
                  <p class="email-body"  style="max-width: 500px;">
                  This OTP is valid only for next 10 minutes
                  </p>
                </td>
              </tr>
              <tr><td></td></tr>
              <tr>
                <td class="thanks">
                Best regards,<br />
                RateUp.app <br />
                Website: <a href="https://rateup.app/">https://rateup.app/</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>
 `;
}
