/**
 * RateUp Loyalty Program - Type Definitions
 * Complete type definitions for the loyalty program system
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum LoyaltyProgramStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
}

export enum LoyaltyEarningRuleStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SCHEDULED = "scheduled",
  EXPIRED = "expired",
}

export enum LoyaltyRewardStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  OUT_OF_STOCK = "out_of_stock",
}

export enum LoyaltyRewardType {
  POINT = "point",
  COUPON = "coupon",
  ASSIGNED = "assigned",
}

export enum LoyaltyTransactionType {
  EARN = "earn",
  REDEEM = "redeem",
  ADJUST = "adjust",
  EXPIRE = "expire",
  REFUND = "refund",
}

export enum LoyaltyTransactionSource {
  PURCHASE = "purchase",
  SIGNUP_BONUS = "signup_bonus",
  REFERRAL = "referral",
  REWARD_REDEMPTION = "reward_redemption",
  MANUAL = "manual",
}

export enum LoyaltyRedemptionStatus {
  PENDING = "pending",
  APPROVED = "approved",
  USED = "used",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

export enum LoyaltyReferralStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  EXPIRED = "expired",
}

export enum CustomerAccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  CLOSED = "closed",
}

export enum TierResetPeriod {
  NEVER = "never",
  YEARLY = "yearly",
  MONTHLY = "monthly",
}

export enum DayOfWeek {
  MONDAY = "monday",
  TUESDAY = "tuesday",
  WEDNESDAY = "wednesday",
  THURSDAY = "thursday",
  FRIDAY = "friday",
  SATURDAY = "saturday",
  SUNDAY = "sunday",
}

// ============================================================================
// EARNING RULE CONDITIONS
// ============================================================================

export interface LoyaltyEarningRuleTimeRange {
  start: string; // "HH:mm" format (e.g., "14:00")
  end: string; // "HH:mm" format (e.g., "17:00")
}

export interface LoyaltyEarningRuleTimeRanges {
  time_ranges: LoyaltyEarningRuleTimeRange[];
}

export interface LocationCondition {
  enabled: boolean;
  location_ids: string[];
}

export interface ProductCondition {
  enabled: boolean;
  categories?: string[];
  product_skus?: string[];
  excluded_categories?: string[];
}

export interface PaymentMethodCondition {
  enabled: boolean;
  allowed_methods: string[];
}

export interface CustomerTypeCondition {
  enabled: boolean;
  types: ("new" | "returning" | "first_purchase_only")[];
}

export interface ChannelCondition {
  enabled: boolean;
  allowed_channels: ("online" | "in_store" | "mobile_app")[];
}

export interface LoyaltyEarningRuleConditions {
  locations?: LocationCondition;
  products?: ProductCondition;
  payment_methods?: PaymentMethodCondition;
  customer_type?: CustomerTypeCondition;
  channels?: ChannelCondition;
}

// ============================================================================
// REWARD VALUE TYPES
// ============================================================================

export enum LoyaltyPointRewardSubType {
  DISCOUNT_FIXED = "discount_fixed",
  DISCOUNT_PERCENTAGE = "discount_percentage",
  FREE_ITEM = "free_item",
}

export interface DiscountFixedValue {
  type: LoyaltyPointRewardSubType.DISCOUNT_FIXED;
  amount: number;
  currency: string;
}

export interface DiscountPercentageValue {
  type: LoyaltyPointRewardSubType.DISCOUNT_PERCENTAGE;
  percentage: number;
  max_discount_amount?: number;
}

export interface FreeItemValue {
  type: LoyaltyPointRewardSubType.FREE_ITEM;
  item_name: string;
  item_sku?: string;
  item_value?: number;
}

export type LoyaltyRewardValue = DiscountFixedValue | DiscountPercentageValue | FreeItemValue;

// ============================================================================
// REDEMPTION RULES
// ============================================================================

export interface TimeRestrictions {
  enabled: boolean;
  allowed_days?: DayOfWeek[];
  allowed_time_ranges?: LoyaltyEarningRuleTimeRange[];
  blackout_dates?: string[]; // ISO date strings
  valid_from?: string; // ISO datetime
  valid_until?: string; // ISO datetime
}

export interface QuantityRestrictions {
  one_time_use?: boolean;
  max_redemptions_per_customer?: number;
  max_redemptions_per_day?: number;
  max_redemptions_per_week?: number;
  max_redemptions_per_month?: number;
}

export interface SpendRequirements {
  enabled: boolean;
  minimum_spend?: number;
  exclude_reward_value_from_minimum?: boolean;
}

export interface TierRestrictions {
  enabled: boolean;
  allowed_tiers?: string[];
}

export interface CooldownRestrictions {
  enabled: boolean;
  period_hours?: number;
}

export interface InventoryRestrictions {
  enabled: boolean;
  total_stock?: number;
  daily_stock?: number;
  weekly_stock?: number;
  reset_period?: "daily" | "weekly" | "monthly";
}

export interface CombinationRules {
  cannot_combine_with_other_rewards?: boolean;
  cannot_combine_with_promotions?: boolean;
}

export interface ApprovalRules {
  requires_manual_approval?: boolean;
  requires_manager_approval?: boolean;
  auto_approve_for_tiers?: string[];
}

export interface LoyaltyRedemptionRules {
  time_restrictions?: TimeRestrictions;
  quantity_restrictions?: QuantityRestrictions;
  spend_requirements?: SpendRequirements;
  tier_restrictions?: TierRestrictions;
  cooldown?: CooldownRestrictions;
  inventory?: InventoryRestrictions;
  combination_rules?: CombinationRules;
  approval?: ApprovalRules;
}

// ============================================================================
// TRANSACTION & REDEMPTION METADATA
// ============================================================================

export interface LoyaltyTransactionMetadata {
  order_total?: number;
  items?: string[];
  location_id?: string;
  payment_method?: string;
  channel?: string;
  [key: string]: any;
}

export interface LoyaltyRedemptionContext {
  purchase_amount?: number;
  order_id?: string;
  location_id?: string;
  [key: string]: any;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Award Points Request
export interface AwardPointsRequest {
  customer_phone: string;
  points: number;
  reference_id: string;
  description?: string;
  metadata?: LoyaltyTransactionMetadata;
}

export interface PointsCalculation {
  base_amount: number;
  base_points: number;
  rule_multiplier: number;
  rule_bonus: number;
  tier_multiplier: number;
  final_points: number;
}

export interface AwardPointsResponse {
  success: boolean;
  transaction: {
    id: string;
    customer: {
      phone: string;
      name: string;
      current_points: number;
      lifetime_points: number;
      tier: string;
    };
    points_awarded: number;
    earning_rule_applied: {
      id: string;
      name: string;
      base_rate: number;
      multiplier: number;
    };
    tier_multiplier: number;
    calculation: PointsCalculation;
    balance_after: number;
    tier_upgraded: boolean;
  };
}

// Redeem Reward Request
export interface RedeemRewardRequest {
  customer_phone: string;
  reward_id: string;
  reference_id?: string;
  context?: LoyaltyRedemptionContext;
}

export interface RedeemRewardResponse {
  success: boolean;
  redemption?: {
    id: string;
    redemption_code: string;
    reward: {
      name: string;
      type: string;
      value: LoyaltyRewardValue;
    };
    points_deducted: number;
    balance_after: number;
    expires_at: string;
    status: string;
  };
  error?: string;
  violations?: string[];
}

// Get Customer Info Response
export interface CustomerInfoResponse {
  success: boolean;
  customer: {
    id: string;
    phone: string;
    name: string;
    current_points: number;
    lifetime_points: number;
    tier: {
      id: string;
      name: string;
      threshold: number;
      multiplier: number;
      color: string;
    };
    next_tier?: {
      name: string;
      points_needed: number;
    };
    referral_code: string;
    referral_link: string;
    member_since: string;
  };
  available_rewards: Array<{
    id: string;
    name: string;
    points_cost: number;
    can_redeem: boolean;
    reason?: string;
    rules_summary?: string;
  }>;
}

// Create Customer Request
export interface CreateCustomerRequest {
  customer_phone: string;
  customer_name?: string;
  referred_by_code?: string;
}

export interface CreateCustomerResponse {
  success: boolean;
  customer: {
    id: string;
    phone: string;
    name: string;
    current_points: number;
    referral_code: string;
    signup_bonus_awarded: number;
  };
}

// Track Referral Request
export interface TrackReferralRequest {
  referral_code: string;
  new_customer_phone: string;
  new_customer_name?: string;
}

export interface TrackReferralResponse {
  success: boolean;
  referral: {
    id: string;
    referrer: {
      name: string;
      bonus_pending: number;
    };
    referee: {
      name: string;
      signup_bonus: number;
      referral_bonus: number;
    };
    status: string;
    note: string;
  };
}

// Verify Redemption Code Request
export interface VerifyRedemptionRequest {
  code: string;
  order_total: number;
  order_id: string;
}

export interface VerifyRedemptionResponse {
  success: boolean;
  valid: boolean;
  redemption?: {
    id: string;
    code: string;
    status: string;
    expires_at: string;
  };
  customer?: {
    name: string;
    phone: string;
    tier: string;
  };
  reward?: {
    name: string;
    type: string;
    amount?: number;
    percentage?: number;
  };
  validation?: {
    minimum_spend_met: boolean;
    rules_passed: boolean;
  };
  discount_amount?: number;
  new_total?: number;
}

// Apply Redemption Request
export interface ApplyRedemptionRequest {
  code: string;
  order_id: string;
  order_total: number;
  discount_applied: number;
  final_total: number;
}

export interface ApplyRedemptionResponse {
  success: boolean;
  message: string;
  redemption: {
    code: string;
    status: string;
    used_at: string;
  };
}

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface RedemptionValidationResult {
  valid: boolean;
  violations: string[];
  reward: any;
  customer: any;
}

// ============================================================================
// EARNING CONTEXT
// ============================================================================

export interface EarningContext {
  purchase_amount: number;
  location_id?: string;
  categories?: string[];
  product_skus?: string[];
  payment_method?: string;
  customer_type?: "new" | "returning" | "first_purchase_only";
  channel?: "online" | "in_store" | "mobile_app";
  [key: string]: any;
}

// ============================================================================
// CALCULATION RESULT
// ============================================================================

export interface PointsCalculationResult {
  points: number;
  rule: any;
  calculation: PointsCalculation;
}

// ============================================================================
// WHATSAPP COMMAND TYPES
// ============================================================================

export enum WhatsAppCommandType {
  BALANCE = "balance",
  REWARDS = "rewards",
  REDEEM = "redeem",
  REFER = "refer",
  HISTORY = "history",
  HELP = "help",
  UNKNOWN = "unknown",
}

export interface ParsedCommand {
  type: WhatsAppCommandType;
  rewardNumber?: number;
  rawMessage: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface ProgramStats {
  total_customers: number;
  points_issued: number;
  redemptions: number;
  pending_approvals: number;
  trends: {
    customers_change: string;
    points_change: string;
    redemption_rate: string;
  };
}

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  tier: string;
  current_points: number;
  lifetime_points: number;
  last_active: string;
}

export interface TransactionListItem {
  id: string;
  customer_name: string;
  type: string;
  points: number;
  description: string;
  date: string;
  status: string;
}

export interface ApprovalQueueItem {
  id: string;
  customer_name: string;
  customer_phone: string;
  reward_name: string;
  points_cost: number;
  purchase_amount?: number;
  order_id?: string;
  requested_at: string;
}

// ============================================================================
// SETUP WIZARD TYPES
// ============================================================================

export interface SetupWizardStep1 {
  program_name: string;
  currency_name: string;
  currency_code: string;
  currency_symbol: string;
}

export interface SetupWizardStep2 {
  points_per_unit: number;
  signup_bonus: number;
  referral_bonus: number;
  referee_bonus: number;
}

export interface TierConfiguration {
  name: string;
  threshold: number;
  multiplier: number;
  color: string;
  benefits_description?: string;
}

export interface SetupWizardStep3 {
  tiers_enabled: boolean;
  tiers: TierConfiguration[];
}

export interface SetupWizardStep4 {
  skip_rewards: boolean;
  rewards?: Array<{
    name: string;
    points_cost: number;
    reward_type: LoyaltyRewardType;
    reward_value: LoyaltyRewardValue;
  }>;
}

export interface SetupWizardComplete {
  step1: SetupWizardStep1;
  step2: SetupWizardStep2;
  step3: SetupWizardStep3;
  step4: SetupWizardStep4;
}
