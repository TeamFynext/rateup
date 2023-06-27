import AWS, { S3 } from 'aws-sdk';

const s3config = new AWS.S3({
    accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
    region: process.env.AWS_S3_REGION,
  });
  
const CLOUDFRONT_DOMAIN = process.env.AWS_CLOUDFRONT_DOMAIN
  
export async function uploadFile(params: S3.PutObjectRequest): Promise<string> {
    return new Promise((resolve, reject) => {
    s3config.upload(params, (err: any, data: any) => {
        if (err) {
        reject(err);
        } else {
        const fileUrl = `https://${CLOUDFRONT_DOMAIN}/${params.Key}`; // CloudFront URL for the uploaded file
        resolve(fileUrl);
        }
    });
    });
}