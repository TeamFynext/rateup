export function createEmailBody(invite_link : string, email_id : string) {
    return `
    <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tbody><tr>
                <td valign="top">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tbody>
                            <tr>
                                <td valign="top">
                                    <div style="background-color:#fff;margin-left:3%;margin-right:3%;border:1px solid #ddd;margin-top:40px;border-radius:6px">
                                        <div style="padding-left:15%;padding-right:15%">
                                            <p style="font-family:'Helvetica';font-size:16px;line-height:26px;font-weight:700;text-align:center;padding-top:24px;padding-bottom:24px;padding-left:8%;padding-right:8%">
                                                You are invited to manage a team in <span style="color:#3A6EA5"> RateUp App. </span> <br/> Click on the accept button below to continue with the process.
                                            </p>
                                            <div style="border-radius:6px;margin-bottom:50px;display:block;text-align:center">
                                                <a href="${invite_link}" style="background:#52b56e;font-size:17px;line-height:24px;font-weight:700;font-family:'Helvetica',sans-serif;text-decoration:none;padding:9px 25px 9px 25px;color:#ffffff;display:block;border-radius:6px;width:fit-content;margin:0 auto" target="_blank" data-saferedirecturl="">Accept
                                                    Invitation</a>
                                            </div>
                                        </div>
                                        <div style="background-color:#fafafa;border-top:1px solid #ddd;padding-left:15%;padding-right:15%;padding-bottom:24px;padding-top:24px">
                                            <p style="font-family:'Hevetica',sans-serif;font-size:14px;line-height:23px;font-weight:400;text-align:center;color:#808080">
                                                Alternatively, you can directly paste this link
                                                in your browser <br>
                                                <a style="font-family:'Helvetica',sans-serif,sans-serif;text-align:center;word-break:break-all;font-weight:400;font-size:14px;line-height:23px;color:#007aff!important" href="${invite_link}" target="_blank" >${invite_link}</a>
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tbody>
                            <tr>
                                <td valign="top">
                                    <p style="font-family:'Helvetica',sans-serif;font-size:16px;line-height:26px;font-weight:400;text-align:center;color:#808080">
                                        This email is meant for <a style="font-family:'Helvetica',sans-serif;text-align:center;word-break:break-all;font-weight:400;font-size:16px;line-height:26px;color:#808080!important" href="mailto:${email_id}" target="_blank">${email_id}</a>
                                    </p>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>
        </tbody>
        </table>
        `;
}
