import { Prisma } from "../../../../generated/prisma/client.js";
import prisma from "../../../utils/prisma.js";
import type { LoyaltyPendingBonuses } from "../../../types/loyalty.js";
import {
  CustomerLoyaltyAccountInput,
  CustomerLoyaltyAccountUpdateInput,
} from "./account.schema.js";
import {
  calculatePointsForPurchase,
  checkAndUpgradeTier,
  generateReferralCode,
} from "../earningRulesEngine.js";
import { generateRewardShortCode } from "../../../utils/misc/random.utils.js";
import { sendTextMessage } from "../../whatsapp/whatsappSurvey/wasurvey.service.js";
import { parsePhoneforWa } from "../util.js";
import { LoyaltyError } from "../loyalty.errors.js";
import { findProgramMember } from "./memberLookup.js";
import {
  dispatchLoyaltyNotification,
  NOTIFICATION_NOT_SENT,
  type LoyaltyNotificationOutcome,
} from "../loyaltyWaDispatcher.js";
import { generateWhatsAppJoinLink } from "../../whatsapp/whatsappSurvey/wasurvey.utils.js";
import { LoyaltyEventType, LoyaltyTemplateTypes } from "../../../types/enums.js";
import { renderReplyText } from "../richText.js";
import { scheduleFeedbackRequest } from "../feedback/feedback.scheduler.js";
import { log } from "../../../utils/logger.js";
import { ensureMemberCard, sendMemberCard } from "./memberCard.service.js";

export async function findAccountByReferralCode(programId: string, referralCode: string) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: {
      programId,
      referralCode: { equals: referralCode, mode: "insensitive" },
    },
  });
}

type Db = Prisma.TransactionClient | typeof prisma;

/** How a new account is enrolled. */
export interface CreateCustomerAccountOptions {
  /**
   * Hold the joining and referral bonuses instead of crediting them now. Used by the
   * public join form, where nothing proves the phone is real: the bonuses are frozen in
   * `pendingBonuses` and paid by `releasePendingSignupBonus` the first time the customer
   * messages the business or buys something.
   */
  holdBonuses?: boolean;
  /**
   * The name, birthday and gender in the payload were typed by staff who could see what
   * the contact already said, so they overwrite it. Off for the public join form and the
   * WhatsApp flows, where the payload only fills in what the contact is missing — an
   * open form must not be able to rename someone else's contact.
   */
  trustedDetails?: boolean;
}

export async function createCustomerAccount(
  data: CustomerLoyaltyAccountInput,
  programId: string,
  orgId: string,
  sourceIdentifier?: string,
  options: CreateCustomerAccountOptions = {},
) {
  let contactId;
  let contact;
  const phone = data?.phone?.replaceAll("+", "");
  // Check if contact with this phone already exists
  const existingContact = await prisma.contact.findFirst({
    where: {
      phone,
      orgId,
    },
  });

  if (existingContact) {
    contactId = existingContact.id;
    contact = existingContact;
    // The form may know something the contact record does not — a name for a contact that
    // only ever had a phone, a birthday typed in at the counter. Staff (`trustedDetails`)
    // saw the stored values in the form and may change them; anyone else only fills blanks,
    // because the public join form reaches this code too.
    const trusted = options.trustedDetails === true;
    const changes: Prisma.ContactUpdateInput = {};
    const name = data.name?.trim();
    if (name && (trusted ? name !== existingContact.name : !existingContact.name?.trim())) {
      changes.name = name;
    }
    if (data.dob && (trusted || !existingContact.dob)) changes.dob = new Date(data.dob);
    if (data.gender && (trusted || !existingContact.gender)) changes.gender = data.gender;
    if (Object.keys(changes).length > 0) {
      contact = await prisma.contact.update({ where: { id: contactId }, data: changes });
    }
  } else {
    // Create new contact
    contact = await prisma.contact.create({
      data: {
        orgId,
        phone,
        name: data.name,
        email: data.email,
        source: "loyalty_program",
        dob: data.dob ? new Date(data.dob) : null,
        gender: data.gender ?? null,
      },
    });
    contactId = contact.id;
  }

  // Check if customer already exists
  const existing = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: contactId,
      },
    },
  });

  if (existing) {
    if (existing.status === "inactive") {
      // Reactivate the account
      const account = await prisma.customerLoyaltyAccount.update({
        where: {
          id: existing.id,
        },
        data: {
          status: "active",
        },
        include: {
          contact: true,
        },
      });
      if (account && sourceIdentifier) {
        await sendTextMessage(
          { phone, orgId },
          null,
          `🎉 Welcome back ${account.contact?.name || ""}!`,
        );
      }
      await sendCardAfterEnrolment(orgId, account.id);
      return account;
    } else {
      throw new LoyaltyError("MEMBER_EXISTS", "Customer account already exists");
    }
  }

  // Generate referral code
  const referralCode = await generateReferralCode(
    contact?.name || contact?.phone || "CUSTOMER",
    contact?.phone || contactId,
  );

  // Get program to check signup bonus
  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
  });
  const tier = await prisma.loyaltyTier.findFirst({
    where: {
      programId: programId,
    },
    orderBy: {
      threshold: "asc",
    },
    select: {
      id: true,
    },
  });

  const currentTierId = tier ? tier.id : null;
  const referredBy = data.referCode
    ? await findAccountByReferralCode(programId, data.referCode)
    : null;

  // What this signup is worth, frozen now. The immediate path pays it straight away; the
  // held path stores it and pays the same figures later, whatever the programme says then.
  const snapshot: LoyaltyPendingBonuses = {
    signupBonus: program?.signupBonus || 0,
    refereeBonus: program?.refereeBonus || 0,
    refereeBonusType: program?.refereeBonusType || "points",
    refereeRewardId: program?.refereeRewardId || null,
    referralBonus: program?.referralBonus || 0,
    referralBonusType: program?.referralBonusType || "points",
    referralRewardId: program?.referralRewardId || null,
    referredById: referredBy?.id ?? null,
  };
  const hold = options.holdBonuses === true;

  if (!hold) {
    await creditReferrer(prisma, programId, snapshot, contactId);
  }

  const openingPoints = hold ? 0 : pointsOwedToNewMember(snapshot);
  const account = await prisma.customerLoyaltyAccount.create({
    data: {
      programId,
      contactId: contactId,
      referralCode,
      currentPoints: openingPoints,
      lifetimePoints: openingPoints,
      referredById: snapshot.referredById,
      currentTierId,
      ...(hold ? { verifiedAt: null, pendingBonuses: snapshot } : {}),
    },
    include: {
      contact: true,
    },
  });

  if (!hold) {
    await creditNewMember(prisma, account, snapshot, openingPoints, orgId);
  }

  // Every new member has a card code from day one; it is what lets the first-message send
  // tell them apart from members enrolled before cards existed.
  try {
    await ensureMemberCard(account.id);
  } catch (e) {
    log.error({ err: e, accountId: account.id }, "Could not mint a member card code");
  }

  if (account && sourceIdentifier) {
    const joinLink = generateWhatsAppJoinLink({
      waNumber: sourceIdentifier,
      referralCode: account.referralCode,
      source: data.source,
    });
    // The merchant's own "Joining the program" reply when they wrote one (Messages ›
    // Replies); the stock welcome otherwise. The customer just messaged us, so plain text
    // is the right channel either way.
    const joinReply = await prisma.loyaltyWaCommand.findFirst({
      where: { orgId, type: LoyaltyTemplateTypes.CustomerRegistration },
      select: { content: true },
    });
    const customText = joinReply
      ? renderReplyText(joinReply.content, [account.contact?.name || ""])
      : "";
    await sendTextMessage(
      { phone, orgId },
      null,
      customText.trim().length > 0
        ? customText
        : `🎉 Welcome ${account.contact?.name || ""}!

You are now registered in our Loyalty Program.

🔗 Your referral code: ${referralCode}

 Share & earn rewards:
        `,
    );
    // A second message carrying the referral link, when the caller told us which number
    // to build it from. `sourceIdentifier` is also used as a plain "they messaged us"
    // flag by callers that have no number, so there is not always a link to send.
    if (joinLink) await sendTextMessage({ phone, orgId }, null, joinLink);
  }

  // Outside the `sourceIdentifier` block on purpose: a member enrolled by staff may already
  // have an open WhatsApp window, in which case the card can go now.
  await sendCardAfterEnrolment(orgId, account.id);

  return account;
}

/**
 * The card is a nicety at enrolment, never a condition of it: whatever goes wrong here is
 * logged and the member is still enrolled. Skips (no open window, no public URL) are the
 * expected case for a till registration and are not errors.
 */
async function sendCardAfterEnrolment(orgId: string, accountId: string) {
  try {
    await sendMemberCard({ orgId, accountId });
  } catch (e) {
    log.error({ err: e, accountId }, "Could not send the member card after enrolment");
  }
}

/** The points the new member is owed: the joining bonus plus a points-type referee bonus. */
function pointsOwedToNewMember(snapshot: LoyaltyPendingBonuses): number {
  const refereePoints = snapshot.refereeBonusType === "points" ? snapshot.refereeBonus : 0;
  return snapshot.signupBonus + refereePoints;
}

/** Pay the person whose code was used — points into their balance, or a gift reward. */
async function creditReferrer(
  db: Db,
  programId: string,
  snapshot: LoyaltyPendingBonuses,
  refereeContactId: string,
) {
  if (!snapshot.referredById) return;

  if (snapshot.referralBonusType === "points" && snapshot.referralBonus > 0) {
    const updatedReferrer = await db.customerLoyaltyAccount.update({
      where: { id: snapshot.referredById },
      data: {
        currentPoints: { increment: snapshot.referralBonus },
        lifetimePoints: { increment: snapshot.referralBonus },
      },
    });
    await db.loyaltyTransaction.create({
      data: {
        accountId: snapshot.referredById,
        programId,
        transactionType: "earn",
        source: "referral",
        points: snapshot.referralBonus,
        balanceAfter: updatedReferrer.currentPoints,
        metadata: { refereeContactId },
      },
    });
  } else if (snapshot.referralBonusType === "gift" && snapshot.referralRewardId) {
    try {
      await assignRewardToCustomer(snapshot.referredById, snapshot.referralRewardId);
    } catch (e) {
      if (!(e as Error).message?.includes("already assigned")) throw e;
    }
  }
}

/**
 * The new member's side: the referee gift or ledger row, the joining-bonus ledger row and
 * the "points issued" message. `balanceAfter` is the account's balance once the points are
 * in — a referee who also gets a joining bonus holds both.
 */
async function creditNewMember(
  db: Db,
  account: {
    id: string;
    programId: string;
    referralCode: string;
    contact: { phone: string | null; name: string | null } | null;
  },
  snapshot: LoyaltyPendingBonuses,
  balanceAfter: number,
  orgId: string,
) {
  const refereePoints = snapshot.refereeBonusType === "points" ? snapshot.refereeBonus : 0;

  if (snapshot.referredById) {
    if (snapshot.refereeBonusType === "gift" && snapshot.refereeRewardId) {
      await assignRewardToCustomer(account.id, snapshot.refereeRewardId);
    } else if (refereePoints > 0) {
      await db.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          programId: account.programId,
          transactionType: "earn",
          source: "referral",
          points: refereePoints,
          balanceAfter,
          metadata: { referrerAccountId: snapshot.referredById },
        },
      });
    }
  }

  if (snapshot.signupBonus > 0) {
    await db.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        programId: account.programId,
        transactionType: "earn",
        source: "signup_bonus",
        points: snapshot.signupBonus,
        balanceAfter,
      },
    });
    // Only meaningful when there were points to announce.
    if (account.contact?.phone) {
      await dispatchLoyaltyNotification(orgId, LoyaltyEventType.POINTS_ISSUED, {
        customerPhone: account.contact.phone,
        customerName: account.contact.name || "Customer",
        points: snapshot.signupBonus,
        balanceAfter,
        reason: "Signup Bonus",
        referralCode: account.referralCode, // passing just in case
      });
    }
  }
}

/**
 * Pay out a held web signup. Exactly once: the `verifiedAt IS NULL` guard on the first
 * write is what makes a second caller (a purchase and a message in the same minute) a
 * no-op. Returns whether anything was released.
 */
export async function releasePendingSignupBonus(
  accountId: string,
  db: Db = prisma,
): Promise<boolean> {
  const claimed = await db.customerLoyaltyAccount.updateMany({
    where: { id: accountId, verifiedAt: null },
    data: { verifiedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const account = await db.customerLoyaltyAccount.findUnique({
    where: { id: accountId },
    include: { contact: { select: { phone: true, name: true, orgId: true } } },
  });
  const snapshot = account?.pendingBonuses ?? null;
  if (!account || !snapshot) return false;

  await creditReferrer(db, account.programId, snapshot, account.contactId);

  const points = pointsOwedToNewMember(snapshot);
  const updated = await db.customerLoyaltyAccount.update({
    where: { id: accountId },
    data: {
      ...(points > 0
        ? { currentPoints: { increment: points }, lifetimePoints: { increment: points } }
        : {}),
      pendingBonuses: Prisma.DbNull,
    },
  });

  await creditNewMember(db, account, snapshot, updated.currentPoints, account.contact.orgId);
  return true;
}

/** The inbound-WhatsApp form of the release: the customer is known only by their number. */
export async function releasePendingSignupBonusByPhone(
  phone: string,
  orgId: string,
): Promise<boolean> {
  const pending = await prisma.customerLoyaltyAccount.findFirst({
    where: { verifiedAt: null, contact: { phone: parsePhoneforWa(phone), orgId } },
    select: { id: true },
  });
  if (!pending) return false;
  return await releasePendingSignupBonus(pending.id);
}

export async function getCustomerAccounts(programId: string, search?: string, name?: string) {
  const contactFilter: Record<string, unknown> = {};
  if (name) {
    contactFilter.name = { contains: name, mode: "insensitive" };
  } else if (search) {
    contactFilter.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  return await prisma.customerLoyaltyAccount.findMany({
    where: {
      programId,
      ...(Object.keys(contactFilter).length > 0 ? { contact: contactFilter } : {}),
    },
    include: {
      currentTier: true,
      contact: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      assignedRewards: {
        include: {
          reward: true,
        },
      },
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          reward: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerAccountsForExport(programId: string) {
  return await prisma.customerLoyaltyAccount.findMany({
    where: { programId },
    select: {
      contact: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      currentTier: {
        select: {
          name: true,
        },
      },
      currentPoints: true,
      lifetimePoints: true,
      referralCode: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerAccountById(customerId: string, programId: string) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: { id: customerId, programId },
    include: {
      currentTier: true,
      transactions: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      redemptions: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      referrals: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getCustomerAccountByContact(programId: string, contactId: string) {
  return await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId,
      },
    },
    include: {
      contact: true,
      currentTier: true,
      transactions: {
        take: 20,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

/**
 * Everything the counter needs about one member in a single read. Shared by the phone
 * lookup and the card-code lookup so both hand the controller the same shape.
 */
export const CASHIER_ACCOUNT_INCLUDE = {
  contact: {
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  },
  assignedRewards: {
    include: {
      reward: true,
    },
  },
  currentTier: true,
  transactions: {
    take: 20,
    orderBy: { createdAt: "desc" },
  },
  // Deep enough that an approved-but-unused redemption is still in view for the
  // cashier's "waiting" strip after a run of newer ones.
  redemptions: {
    take: 25,
    orderBy: { createdAt: "desc" },
    include: {
      reward: true,
    },
  },
} satisfies Prisma.CustomerLoyaltyAccountInclude;

export async function getCustomerAccountByPhone(
  programId: string,
  phoneNumber: string,
  orgId: string,
) {
  // Contacts store the number without a leading "+" (see `createCustomerAccount`), so
  // normalise the way `lookupContactByPhone` does — a "+91…" from a QR scan must still hit.
  const contact = await prisma.contact.findFirst({
    where: {
      phone: parsePhoneforWa(phoneNumber),
      orgId,
    },
  });

  if (!contact) {
    return null;
  }

  // Then find the customer account
  return await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId: contact.id,
      },
    },
    include: CASHIER_ACCOUNT_INCLUDE,
  });
}

/**
 * The member whose card was scanned. `cardCode` is globally unique, but the programme is
 * in the `where` all the same so a card from another org is a plain 404 here.
 */
export async function getCustomerAccountByCardCode(programId: string, cardCode: string) {
  return await prisma.customerLoyaltyAccount.findFirst({
    where: { programId, cardCode },
    include: CASHIER_ACCOUNT_INCLUDE,
  });
}

export async function updateCustomerAccount(
  customerId: string,
  data: CustomerLoyaltyAccountUpdateInput,
  programId: string,
) {
  const { status, name, dob, gender, email } = data;

  // The contact fields are written through the relation rather than by contactId, so the
  // `programId` in the where clause is what scopes the edit: a customerId from another
  // org matches nothing and the update throws P2025, which the handler answers as a 404.
  const contactChanges = {
    ...(name !== undefined ? { name } : {}),
    ...(dob !== undefined ? { dob: dob === null ? null : new Date(dob) } : {}),
    ...(gender !== undefined ? { gender } : {}),
    ...(email !== undefined ? { email } : {}),
  };

  return await prisma.customerLoyaltyAccount.update({
    where: { id: customerId, programId },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(Object.keys(contactChanges).length > 0 ? { contact: { update: contactChanges } } : {}),
    },
    include: {
      contact: {
        select: { id: true, name: true, phone: true, email: true, dob: true, gender: true },
      },
    },
  });
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

/**
 * The answer to an award that had already been made under this idempotency key.
 *
 * Rebuilt from the stored ledger row and the account as it stands, rather than from a
 * snapshot: the figures a caller needs (what was awarded, what the balance is now) are both
 * still true. What is deliberately *not* replayed is anything describing an action — no
 * WhatsApp message went out this time, and this call moved nobody between tiers — so those
 * read as "nothing happened", which is exactly what happened.
 */
function replayOf(
  transaction: { id: string; points: number; balanceAfter: number; metadata: unknown },
  customer: { currentTier?: { name: string } | null },
) {
  const meta = (transaction.metadata ?? {}) as {
    appliedRuleId?: string;
    appliedRuleName?: string;
  };
  return {
    replayed: true as const,
    customer: null,
    transaction,
    pointsAwarded: transaction.points,
    calculation: null,
    rule: meta.appliedRuleId
      ? { id: meta.appliedRuleId, name: meta.appliedRuleName ?? "", multiplier: 1, bonusPoints: 0 }
      : null,
    tier: {
      current: null,
      previous: customer.currentTier?.name ?? null,
      upgraded: false,
      next: null,
      amountToNext: null,
    },
    notification: { ...NOTIFICATION_NOT_SENT, skippedReason: "replayed" },
    tierNotification: null,
  };
}

export async function awardPoints(
  programId: string,
  contactId: string,
  purchaseAmount: number,
  context: {
    locationId?: string;
    productCategories?: string[];
    productSkus?: string[];
    paymentMethod?: string;
    channel?: string;
    orderId?: string;
    notes?: string;
    /**
     * Collapses a retried call onto the award it already made. A caller that cannot tell
     * whether its request landed — a POS that lost the reply, a webhook Shopify re-sent —
     * passes the same key again and gets the original result back with `replayed: true`,
     * rather than crediting the customer twice.
     */
    idempotencyKey?: string;
  },
) {
  // Get customer
  const customer = await prisma.customerLoyaltyAccount.findUnique({
    where: {
      programId_contactId: {
        programId,
        contactId,
      },
    },
    include: {
      contact: true, // Need contact for phone number
      program: true, // Need orgId? OrgId is usually checking program ownership.
      currentTier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!customer) {
    throw new LoyaltyError("MEMBER_NOT_FOUND", "Customer account not found. Create account first.");
  }

  const member = customer;

  if (context.idempotencyKey) {
    const already = await prisma.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: { programId, idempotencyKey: context.idempotencyKey },
      },
    });
    if (already) return replayOf(already, customer);
  }

  // A purchase verifies a held web signup. Paid before the purchase is booked so the
  // purchase row's balance-after includes the joining bonus.
  await releasePendingSignupBonus(customer.id);

  const awarded = await runAward();
  if (!awarded) {
    // Lost a race with an identical request. The unique violation aborted the whole
    // transaction, so the balance increments rolled back with the ledger insert and the
    // winner's row is the only award that exists.
    const winner = await prisma.loyaltyTransaction.findUnique({
      where: {
        programId_idempotencyKey: {
          programId,
          idempotencyKey: context.idempotencyKey as string,
        },
      },
    });
    if (winner) return replayOf(winner, customer);
    // The key collided but its row is not there to read back. Not a business outcome —
    // untyped on purpose, so it surfaces as a 500 and gets looked at.
    throw new Error(
      `Idempotency key ${context.idempotencyKey} collided but no transaction was found`,
    );
  }
  const { points, updatedCustomer, transaction, calculated } = awarded;

  async function runAward() {
    try {
      return await prisma.$transaction(async (tx) => {
        const calculated = await calculatePointsForPurchase(
          programId,
          member.id,
          purchaseAmount,
          {
            purchase_amount: purchaseAmount,
            location_id: context.locationId,
            categories: context.productCategories,
            product_skus: context.productSkus,
            payment_method: context.paymentMethod,
            channel:
              context.channel === "online" ||
              context.channel === "in_store" ||
              context.channel === "mobile_app"
                ? context.channel
                : undefined,
            orderId: context.orderId,
            notes: context.notes,
          },
          tx,
        );

        // Update customer points and total spend
        const account = await tx.customerLoyaltyAccount.update({
          where: { id: member.id },
          data: {
            currentPoints: {
              increment: calculated.points,
            },
            lifetimePoints: {
              increment: calculated.points,
            },
            totalSpend: {
              increment: purchaseAmount,
            },
          },
        });

        // Create transaction
        const ledgerRow = await tx.loyaltyTransaction.create({
          data: {
            accountId: member.id,
            programId,
            transactionType: "earn",
            source: "purchase",
            points: calculated.points,
            balanceAfter: account.currentPoints,
            // Typed as well as in metadata: trailing-window tier qualification sums it.
            purchaseAmount,
            // Searchable (indexed) but NOT unique — several other writers share this column.
            referenceId: context.orderId ?? null,
            // The uniqueness guarantee lives here. Inside the transaction, so a violation
            // rolls the balance increment back with it.
            idempotencyKey: context.idempotencyKey ?? null,
            metadata: {
              purchaseAmount,
              orderId: context.orderId,
              appliedRuleId: calculated.rule?.id,
              appliedRuleName: calculated.rule?.name,
              ...context,
            },
          },
        });

        return {
          points: calculated.points,
          updatedCustomer: account,
          transaction: ledgerRow,
          calculated,
        };
      });
    } catch (e) {
      if (context.idempotencyKey && isUniqueViolation(e)) return null;
      throw e;
    }
  }

  // Ask for feedback later, if the programme has it switched on. Off the request path: the
  // scheduler only opens a row and arms a delayed job, and a failure there is not the
  // cashier's problem — the points are already awarded.
  void scheduleFeedbackRequest({
    programId,
    accountId: customer.id,
    transactionId: transaction.id,
  }).catch((e) =>
    log.error({ err: e, accountId: customer.id }, "Could not schedule a feedback request"),
  );

  // Check for tier upgrade
  const upgradeResult = await checkAndUpgradeTier(customer.id, Number(updatedCustomer.totalSpend));

  // Dispatch Notifications. The outcomes come back so the cashier receipt can show the
  // message that went out — or say why nothing did.
  let notification: LoyaltyNotificationOutcome = NOTIFICATION_NOT_SENT;
  let tierNotification: LoyaltyNotificationOutcome | null = null;

  if (customer.contact?.phone && customer.contact?.orgId) {
    // Points Issued
    notification =
      (await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.POINTS_ISSUED, {
        customerPhone: customer.contact.phone,
        customerName: customer.contact.name || "Customer",
        points,
        balanceAfter: updatedCustomer.currentPoints,
        reason: "Purchase",
      })) ?? NOTIFICATION_NOT_SENT;

    // Tier Upgraded
    if (upgradeResult?.upgraded) {
      tierNotification =
        (await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.TIER_UPGRADED, {
          customerPhone: customer.contact.phone,
          customerName: customer.contact.name || "Customer",
          newTier: upgradeResult.newTier?.name || "New Tier",
          oldTier: customer.currentTier?.name || undefined, // We only have ID here, ideal would be name
          lifetimePoints: updatedCustomer.lifetimePoints,
        })) ?? NOTIFICATION_NOT_SENT;
    }
  } else {
    notification = { ...NOTIFICATION_NOT_SENT, skippedReason: "no_phone" };
  }

  return {
    /** False here; true when this call only re-read an award an earlier one had made. */
    replayed: false,
    customer: updatedCustomer,
    transaction,
    pointsAwarded: points,
    /* Receipt detail. Additive — Shopify and the external API keep reading the three
       fields above. */
    calculation: calculated,
    rule: calculated.rule
      ? {
          id: calculated.rule.id,
          name: calculated.rule.name,
          multiplier: Number(calculated.rule.multiplier ?? 1),
          bonusPoints: Number(calculated.rule.bonusPoints ?? 0),
        }
      : null,
    tier: {
      current: tierSummary(upgradeResult?.currentTier),
      previous: customer.currentTier?.name ?? null,
      upgraded: Boolean(upgradeResult?.upgraded),
      next: tierSummary(upgradeResult?.nextTier),
      amountToNext: upgradeResult?.amountToNext ?? null,
    },
    notification,
    tierNotification,
  };
}

/** Tier rows carry Decimal columns; the receipt wants plain numbers. */
function tierSummary(
  tier:
    | { id: string; name: string; threshold: unknown; pointsMultiplier: unknown; color?: string }
    | null
    | undefined,
) {
  if (!tier) return null;
  return {
    id: tier.id,
    name: tier.name,
    threshold: Number(tier.threshold),
    pointsMultiplier: Number(tier.pointsMultiplier),
    color: tier.color ?? null,
  };
}

/**
 * Looks a phone number up for the add-customer form.
 *
 * Deliberately different from `getCustomerAccountByPhone`, which only finds people who
 * are *already* loyalty members and 404s otherwise. The point here is the opposite case:
 * someone the org already has a Contact for (from a WhatsApp conversation, an import, a
 * survey) who has never joined the programme. `createCustomerAccount` will reuse that
 * contact on submit, so surfacing it lets the cashier confirm the name instead of
 * retyping it — and warns them when the person is already a member.
 *
 * Contacts store the number without a leading "+", matching how `createCustomerAccount`
 * writes it, so normalise before comparing.
 */
export async function lookupContactByPhone(phone: string, orgId: string) {
  const normalized = parsePhoneforWa(phone);

  const contact = await prisma.contact.findFirst({
    where: { phone: normalized, orgId },
    select: { id: true, name: true, email: true, dob: true, gender: true },
  });

  if (!contact) {
    return { contact: null, alreadyMember: false };
  }

  const account = await prisma.customerLoyaltyAccount.findFirst({
    where: { contactId: contact.id, program: { orgId } },
    select: { id: true, status: true },
  });

  return {
    contact,
    // An inactive account is reactivated on submit rather than rejected, so it is not
    // the same "already a member" dead end as an active one.
    alreadyMember: Boolean(account && account.status === "active"),
  };
}

/**
 * The org's contacts as candidates for enrolment, for the cashier's "from contacts" list.
 *
 * Only contacts with a phone number qualify — a loyalty account is keyed on the phone the
 * customer messages from, so a contact without one has nothing to enrol. Each row says
 * whether the person is already in the programme, so the picker can label members
 * rather than let the cashier register someone twice.
 */
export async function searchContactsForEnrolment(
  orgId: string,
  { search, limit }: { search?: string; limit: number },
) {
  const term = search?.trim() ?? "";
  const digits = term.replace(/\D/g, "");
  const textMatch: Prisma.ContactWhereInput[] = [];
  if (term.length > 0) {
    textMatch.push({ name: { contains: term, mode: "insensitive" } });
    textMatch.push({ email: { contains: term, mode: "insensitive" } });
    // Matching on digits alone lets "+91 90000" find the contact stored as "9190000…".
    if (digits.length > 0) textMatch.push({ phone: { contains: digits } });
  }

  const contacts = await prisma.contact.findMany({
    where: {
      orgId,
      phone: { not: null },
      isSpam: false,
      ...(textMatch.length > 0 ? { OR: textMatch } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dob: true,
      gender: true,
      loyaltyAccounts: {
        where: { program: { orgId } },
        select: { status: true },
        take: 1,
      },
    },
    orderBy: [
      { lastReceivedMessageTimeStamp: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    take: limit,
  });

  return contacts.map(({ loyaltyAccounts, ...contact }) => ({
    ...contact,
    /** `null` when the contact has never joined; otherwise the account's status. */
    memberStatus: loyaltyAccounts[0]?.status ?? null,
  }));
}

/**
 * The member behind an inbound WhatsApp number.
 *
 * A thin wrapper over `resolveProgramMember` so the command handlers share one matcher with
 * the Shopify bridge and the partner API — which is also how they inherited the fix for
 * numbers that arrive spaced or in local format. Inactive accounts are returned rather than
 * hidden: every caller checks `status` itself in order to say "your membership is not
 * active" rather than "who are you?".
 */
/**
 * A page of the programme's members.
 *
 * Distinct from `getCustomerAccounts`, which returns every account with its rewards and
 * redemptions attached. That is fine behind a dashboard that asks for one programme at a
 * time, but it was also what the partner API's "list customers" endpoint called — so a shop
 * with fifty thousand members got all of them, with everything hanging off them, in one
 * unbounded response.
 */
export async function getCustomerAccountsPaged(
  programId: string,
  opts: { page: number; limit: number; search?: string; status?: string },
) {
  const where: Prisma.CustomerLoyaltyAccountWhereInput = { programId };
  if (opts.status) where.status = opts.status;
  if (opts.search) {
    const term = opts.search.trim();
    where.contact = {
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { phone: { contains: term.replace(/\D/g, "") || term } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    };
  }

  const [total, rows] = await Promise.all([
    prisma.customerLoyaltyAccount.count({ where }),
    prisma.customerLoyaltyAccount.findMany({
      where,
      include: {
        currentTier: { select: { id: true, name: true, color: true } },
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (opts.page - 1) * opts.limit,
      take: opts.limit,
    }),
  ]);

  return {
    rows,
    pagination: {
      page: opts.page,
      limit: opts.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / opts.limit)),
    },
  };
}

export async function getLCustomerByPhone(phone: string, orgId: string) {
  const program = await prisma.loyaltyProgram.findFirst({
    where: { orgId },
    select: { id: true, defaultCountryCode: true },
  });
  if (!program) return null;

  return await findProgramMember({
    programId: program.id,
    orgId,
    defaultCountryCode: program.defaultCountryCode,
    phone,
    includeInactive: true,
  });
}

export async function assignRewardToCustomer(
  customerId: string,
  rewardId: string,
  _notes?: string,
) {
  // Check if customer exists
  const customer = await prisma.customerLoyaltyAccount.findUnique({
    where: { id: customerId },
    include: { contact: true },
  });

  if (!customer) {
    throw new LoyaltyError("MEMBER_NOT_FOUND", "Customer account not found");
  }

  const reward = await prisma.loyaltyReward.findFirst({
    where: { id: rewardId, programId: customer.programId },
  });

  if (!reward) {
    throw new LoyaltyError("REWARD_NOT_FOUND", "Reward not found");
  }

  // Check if reward is already assigned
  const existing = await prisma.customerReward.findUnique({
    where: {
      rewardId_accountId: {
        rewardId,
        accountId: customerId,
      },
    },
  });

  if (existing) {
    throw new LoyaltyError(
      "REWARD_ALREADY_ASSIGNED",
      "Reward is already assigned to this customer",
    );
  }

  let shortCode = generateRewardShortCode();
  let unique = false;
  while (!unique) {
    const exists = await prisma.customerReward.findUnique({
      where: { shortCode },
    });
    if (exists) {
      shortCode = generateRewardShortCode();
    } else {
      unique = true;
    }
  }

  // Assign reward
  const assignment = await prisma.customerReward.create({
    data: {
      rewardId,
      accountId: customerId,
      shortCode,
      status: "ISSUED",
    },
    include: {
      reward: true,
    },
  });

  // Dispatch Notification
  if (customer.contact?.phone && customer.contact?.orgId) {
    await dispatchLoyaltyNotification(customer.contact.orgId, LoyaltyEventType.REWARD_ISSUED, {
      customerPhone: customer.contact.phone,
      customerName: customer.contact.name || "Customer",
      rewardName: reward.name,
      redemptionCode: shortCode,
      rewardId: reward.id,
      rewardWaTemplateId: reward.waTemplateId,
    });
  }

  return assignment;
}

export async function getRewardByShortCode(shortCode: string, orgId: string) {
  const reward = await prisma.customerReward.findUnique({
    where: { shortCode },
    include: {
      account: {
        include: {
          program: true,
          contact: true,
        },
      },
      reward: true,
    },
  });

  if (!reward) {
    throw new LoyaltyError("REWARD_NOT_FOUND", "Reward not found");
  }

  if (reward.account.program.orgId !== orgId) {
    throw new LoyaltyError("REWARD_NOT_FOUND", "Reward not found");
  }

  return reward;
}

export async function markRewardAsRedeemed(shortCode: string, orgId: string) {
  const reward = await getRewardByShortCode(shortCode, orgId);

  if (reward.status === "REDEEMED") {
    throw new LoyaltyError("REWARD_ALREADY_REDEEMED", "Reward is already redeemed");
  }

  try {
    return await prisma.customerReward.update({
      where: { id: reward.id, status: { not: "REDEEMED" } },
      data: {
        status: "REDEEMED",
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
      throw new LoyaltyError("REWARD_ALREADY_REDEEMED", "Reward is already redeemed");
    }
    throw error;
  }
}
