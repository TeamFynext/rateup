// Temporary scraper script untill we have a proper scraping service
// Don't forget to remove dependencies only used for this script

import dayjs from "dayjs";
import { log } from "../../../utils/logger";
import duration from "dayjs/plugin/duration";
dayjs.extend(duration);

import unirest from "unirest";
import * as cheerio from 'cheerio';

// 1s0x3b080d532ed41e8f:0x4b82c54cb11a4989!8m2!
//const data_ID = `0x3b080d532ed41e8f:0x4b82c54cb11a4989`
// 0x3b080d532ed41e8f:0x4b82c54cb11a4989
// allowed values for sort_by: qualityScore, newestFirst, 
const sort_by = `newestFirst`
const getReviewsData = (next_page_token, dataId) => {
    const url = `https://www.google.com/async/reviewDialog?hl=en_us&async=feature_id:${dataId},next_page_token:${next_page_token},sort_by:${sort_by},start_index:,associated_topic:,_fmt:pc`
    return new Promise<[string, object[]]>((resolve, reject) => {

        unirest
            .get(url)
            .headers({
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36",
            })
            .then((response) => {
                const $ = cheerio.load(response.body);

                const userReviews: any[] = [];
                const token = $(".gws-localreviews__general-reviews-block").attr(
                    "data-next-page-token"
                ) || "";

                $(".gws-localreviews__google-review").each((i, el) => {
                    userReviews.push({
                        name: $(el).find(".TSUbDb a").text(),

                        rating: $(el).find(".lTi8oc.z3HNkc").attr("aria-label")?.split(" ")[1],

                        review: $(el).find(".Jtu6Td").text(),

                        date: convertToDate($(el).find(".dehysf").first().text()),
                    })
                });
                resolve([token, userReviews])

            });

    });
};
function convertToDate(str: string) {
    let parts = str.split(' ');
    let number = parseInt(parts[0]);
    if (parts[0] == 'a') {
        number = 1;
    }
    let unit = parts[1];

    let date = new Date();

    if (unit.startsWith('month')) {
        date.setMonth(date.getMonth() - number);
    } else if (unit.startsWith('day')) {
        date.setDate(date.getDate() - number);
    } else if (unit.startsWith('week')) {
        date.setDate(date.getDate() - number * 7);
    } else if (unit.startsWith('year')) {
        date.setFullYear(date.getFullYear() - number);
    } else if (unit.startsWith('hour')) {
        date.setHours(date.getHours() - number);
    } else if (unit.startsWith('minute')) {
        date.setMinutes(date.getMinutes() - number);
    } else if (unit.startsWith('second')) {
        date.setSeconds(date.getSeconds() - number);
    } else {
        log.warn(`Unknown unit: ${unit}`)
    }

    return date;
}

async function main(dataId: string) {
    let next_page_token = ``
    let reviews: any[] = []
    let i = 0;

    while (true) {
        const [token, r] = await getReviewsData(next_page_token, dataId);
        reviews = reviews.concat(r)
        log.trace(`token: ${token}, reviews: ${reviews.length}`)
        if (!token) {
            log.trace('no token')
            break;
        }
        next_page_token = token

        i = i + 1
        await new Promise(r => setTimeout(r, 1000));
    }

    return reviews;
}

export async function scrapeReviews(dataId: string) {
    log.info(`Scraping reviews for ${dataId}`);
    const startTime = dayjs();

    const reviews = await main(dataId)

    log.info(`Scraped ${reviews.length} reviews for dataId => ${dataId}`);
    log.info(`Time taken: ${dayjs.duration(dayjs().diff(startTime)).format("HH:mm:ss")}`)

    return reviews
}