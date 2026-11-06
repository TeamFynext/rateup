import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { initTestSupertokens } from "../../utils/test/test.setup.utils.js";
import { deleteUser } from "../user/user.service.js";

import build from "../../app.js";

const fastifyInstance = await build();

beforeAll(() => {
  process.env.LOG_LEVEL = "fatal";
});
beforeAll(async () => await fastifyInstance.ready());
beforeAll(initTestSupertokens);
let testUsers: string[] = []; //Array<userId>

// or delete all *@test.com?
afterAll(async () => {
  testUsers.forEach(async (userId) => {
    await deleteUser(userId);
  });
});
afterAll(async () => await fastifyInstance.close());

// const createTemporaryTestUser = async () => {
//   const user = await createTestUser(fastifyInstance);
//   testUsers.push(user.id);
//   return user;
// };
describe("Subscription", () => {
  test("test", () => {
    expect(1 + 1).toBe(2);
  });
});

// describe("Subscription", () => {
//   test(
//     "trial gets created on signup",
//     async () => {
//       const user = await createTemporaryTestUser();
//       const { orgId } = await getOrgIdAndRole({ id: user.id });
//       const subscription = await getSubscription(orgId);

//       // expires in 7 days
//       expect(
//         [6, 7].includes(dayjs(subscription.expiresAt).diff(dayjs(), "day"))
//       ).toBe(true);
//     },
//     timeout
//   );

//   describe("Menu", () => {
//     test(
//       "is accessible to trial users",
//       async () => {
//         const user = await createTemporaryTestUser();
//         const session = await createNewTestSession(user.email);

//         const res = await fastifyInstance
//           .inject()
//           .get("/api/menu/all")
//           .cookies({ sAccessToken: session.getAccessToken() });

//         expect(res.statusCode).toBe(200);
//       },
//       timeout
//     );

//     test(
//       "not accessible to expired trial users",
//       async () => {
//         const user = await createTemporaryTestUser();
//         await prisma.subscription.updateMany({
//           where: {
//             org: {
//               owner: {
//                 email: user.email,
//               },
//             },
//           },
//           data: {
//             expiresAt: dayjs().subtract(1, "day").toDate(), // setting expiry to yesterday
//           },
//         });
//         const session = await createNewTestSession(user.email);
//         const res = await fastifyInstance
//           .inject()
//           .get("/api/menu/all")
//           .cookies({ sAccessToken: session.getAccessToken() });
//         expect(res.statusCode).toBe(403);
//       },
//       timeout
//     );

//     test(
//       "not accessible to users without menu feature",
//       async () => {
//         const user = await createTemporaryTestUser();

//         await prisma.subscription.updateMany({
//           where: {
//             org: {
//               owner: {
//                 email: user.email,
//               },
//             },
//           },
//           data: {
//             features: {
//               set: [],
//             },
//           },
//         });

//         const session = await createNewTestSession(user.email);
//         const res = await fastifyInstance
//           .inject()
//           .get("/api/menu/all")
//           .cookies({ sAccessToken: session.getAccessToken() });
//         expect(res.statusCode).toBe(403);
//       },
//       timeout
//     );
//   });

//   describe("Whatsapp", () => {
//     test(
//       "is accessible to trial users",
//       async () => {
//         const user = await createTemporaryTestUser();
//         const { orgId } = await getOrgIdAndRole({ id: user.id });
//         const res = await fastifyInstance
//           .inject()
//           .get(`/api/wa/webhook/${orgId}`);

//         expect(res.statusCode).toBe(500);
//       },
//       timeout
//     );

//     test(
//       "not accessible to users without whatsapp feature",
//       async () => {
//         const user = await createTemporaryTestUser();

//         await prisma.subscription.updateMany({
//           where: {
//             org: {
//               owner: {
//                 email: user.email,
//               },
//             },
//           },
//           data: {
//             features: {
//               set: [],
//             },
//           },
//         });

//         const { orgId } = await getOrgIdAndRole({ id: user.id });
//         const res = await fastifyInstance
//           .inject()
//           .get(`/api/wa/webhook/${orgId}`);
//         expect(res.statusCode).toBe(403);
//       },
//       timeout
//     );
//   });
// });
