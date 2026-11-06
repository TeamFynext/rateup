interface BonusFields {
  signupBonus: number;
  signupBonusEnabled: boolean;
  referralBonus: number;
  referralBonusType: string;
  referralRewardId: string | null;
  refereeBonus: number;
  refereeBonusType: string;
  refereeRewardId: string | null;
  referralBonusEnabled: boolean;
}

/**
 * The bonuses a programme actually pays. A switched-off bonus keeps its stored amounts for
 * the editor, so everything that pays, prices or advertises one reads it through here.
 */
export function effectiveBonuses(program: BonusFields) {
  const referralOn = program.referralBonusEnabled;
  return {
    signupBonus: program.signupBonusEnabled ? program.signupBonus : 0,
    referralBonus: referralOn ? program.referralBonus : 0,
    referralBonusType: referralOn ? program.referralBonusType : "points",
    referralRewardId: referralOn ? program.referralRewardId : null,
    refereeBonus: referralOn ? program.refereeBonus : 0,
    refereeBonusType: referralOn ? program.refereeBonusType : "points",
    refereeRewardId: referralOn ? program.refereeRewardId : null,
  };
}
