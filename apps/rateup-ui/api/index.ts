const server = process.env.SERVER
if(!server) {
  throw new Error("'SERVER' var not found in env")
}
console.log(server)

export async function getSurveys() {
  return sampleSurveys
  try {
  const res = await fetch(`${server}/api/survey`);
  let surveys: Array<any> = await res.json()
  // TODO: check if we can sort & preserve order at the db level
  // @ts-ignore
  surveys.sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
  return surveys
  } catch (e) {
    console.error(e)
    return {message: "Error Occured!"}
  }
}
// TODO: remove this
const sampleSurveys = [
  {
    title: 'Survey 1',
    isActive: false,
    createdAt: 'Wed May 11 2023 01:45:28 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 2',
    isActive: true,
    createdAt: 'Fri Oct 01 2020 22:37:56 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 3 with very long title qfp qfwp qwfp qwfp qwfp qwfp ',
    isActive: true,
    createdAt: 'Sat Jan 15 2023 0:16:25 GMT-0800 (Pacific Standard Time)'
  },
  {
    title: 'Survey 4',
    isActive: true,
    createdAt: 'Tue Apr 26 2022 17:14:12 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 5',
    isActive: false,
    createdAt: 'Mon Jul 26 2021 02:42:05 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 6',
    isActive: false,
    createdAt: 'Fri Dec 31 2021 11:14:49 GMT-0800 (Pacific Standard Time)'
  },
  {
    title: 'Survey 7',
    isActive: true,
    createdAt: 'Tue Aug 31 2021 12:13:23 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 8',
    isActive: true,
    createdAt: 'Sun Jun 20 2021 21:44:22 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 9',
    isActive: true,
    createdAt: 'Sat Jul 03 2021 03:39:32 GMT-0700 (Pacific Daylight Time)'
  },
  {
    title: 'Survey 10',
    isActive: false,
    createdAt: 'Fri Feb 11 2022 18:22:50 GMT-0800 (Pacific Standard Time)'
  }
]
