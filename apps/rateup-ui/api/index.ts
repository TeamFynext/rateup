const server = process.env.NEXT_PUBLIC_SERVER
if(!server) {
  throw new Error("'SERVER' var not found in env")
}

function modifiedFetch (method) {
  return (url: RequestInfo|URL, init?: RequestInit) => fetch(url, {method, ...init})
}
export const GET = modifiedFetch("GET")
export const POST = modifiedFetch("POST")
export const DELETE = modifiedFetch("DELETE")

export function postJson(url, data) {
  return POST(url, {
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
}

const SURVEYURL = `${server}/api/survey`
export async function getSurveys() {
  try {
  const res = await GET(SURVEYURL);
  let surveys: Array<any> = await res.json()
  // TODO: check if we can sort & preserve order at the db level
  // @ts-ignore
  surveys.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
  return surveys
  } catch (e) {
    console.error(e)
    return {error: "Error Occured!"}
  }
}
export async function getSurvey(surveyId) {
  return GET(`${SURVEYURL}/${surveyId}`)
}
export async function createSurvey(survey) {
    return postJson(SURVEYURL, survey)
}
export async function deleteSurvey(surveyId) {
  return DELETE(`${SURVEYURL}/${surveyId}`)
}

const QUESTION_URL = `${server}/api/question`
export async function getQuestions(surveyId) {
  return GET(`${QUESTION_URL}/all/${surveyId}`)
}