export function createEmailBody(invite_link : string, email_id : string) {
    return `
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
    <table width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding: 20px;">
                <table width="600" cellspacing="0" cellpadding="0" border="0" style="padding: 10px 30px; background-color: #fff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                             <h1 style="font-size: 24px; margin-top: 20px;">Invite Request</h1>

                            <img style="margin-top: 20px;" src="https://${process.env.AWS_CLOUDFRONT_DOMAIN}/1694754664208-email_team.jpg" alt="Email Logo" width="180" height="100">
                            <p style="font-size: 18px; margin-top: 40px;">You are invited to join a team in “RateUp App”</p>
                              <div style="margin-top: 60px;">
                                <a href="${invite_link}" style="background: linear-gradient(276.33deg, #3F5BA9 0%, #62CBE6 150.81%); color: #fff; text-decoration: none; font-size: 18px; width: 156px; height: 54px; padding: 20px 40px; border-radius: 30px; margin-top: 20px; ">Join Now</a>
                             </div>

                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <p style="font-size: 16px;">Thanks,</p>
                            <p style="font-size: 16px;">Rateup Team</p>
                            <img src="https://${process.env.AWS_CLOUDFRONT_DOMAIN}/1694754606107-email_logo.jpg" alt="Rateup Logo" width="150" height="55">
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
        `;
}
