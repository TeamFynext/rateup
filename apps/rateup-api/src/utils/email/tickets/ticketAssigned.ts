export function createEmailBodyTicketAssigned(
  ticket_link: string,
  ticket_no: number,
  team_name: string,
  org_name: string,
  priority: string,
) {
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
    
          .verify-btn {
            padding: 14px 24px;
            border-radius: 30px;
            background: var(--RateUp-Blue, #1c518e);
            color: #e5e5ef;
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
            cursor: pointer;
            text-decoration: none;
          }
    
          .thanks {
            color: #0a000d;
            font-size: 18px;
            font-style: normal;
            font-weight: 400;
            line-height: normal;
          }
    
          .email-icon {
            width: 111px;
            height: 111px;
            flex-shrink: 0;
          }
    
          .rateup-logo {
            width: 134px;
            height: 76px;
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
          }
          .col {
            minWidth: 100px;
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
                        src="${process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_IMAGES_URL}/images/email/rateup_logo.png"
                        alt="Rateup Logo"
                        width="134"
                        height="76"
                      />
                  </th>
                </tr>
                <tr>
                  <th class="email-title">Ticket Assigned to you</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <p class="email-body">
                      A ticket has been assigned to you on RateUp.app,
                       under <br/> ${team_name} team of ${org_name}. <br/><br/>
                      Kindly check the ticket and take necessary actions.                
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="padding:10px;" class="email-body">
                        <span style="padding:2px; padding-right:30px;"> Ticket No: </span> <b> #${ticket_no} </b>  <br/> 
                    </p>
                    <p style="padding:10px;" class="email-body">
                      <span style="padding:2px; padding-right:30px;"> Priority: </span> <b> ${priority}    </b> 
                  </p>
                  </td>
                </tr>
            
                <tr>
                  <td>                      <br/>

                    <a href="${ticket_link}" class="verify-btn" style="color: #e5e5ef">
                      View Ticket
                    </a>                      <br/>

                  </td>
                </tr>
                <tr>
                  <td></td>
                </tr>
                <tr>
                  <td class="thanks">
                    Thanks,<br />
                    Rateup Team
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
