# Referral Codes Implementation

!! Payout is done manually. Check rewards on regular basis, payout member/business, update the reward status.

Referrer is the person who refers a new member.

Referral Code is a code used by the new member.

Referral Own Code is a code from an existing member, which he/she can pass on to a new potential member.

Firestore is source of truth for both referral codes and referral events. Custom properties in office rnd are updated for admins for easy lookup/context/reference.

## High level flow chart for confirmation/cancellation logic

```mermaid
flowchart TD
    %% ───────────────────────────────────────────────────────
    %% STAGE 0 – TRIAL & REFERRAL RECORD ALREADY EXISTS
    %% ───────────────────────────────────────────────────────
    A[User finishes trial → clicks “Subscribe” in OfficeRnd] -->|OfficeRnd Webhook: membership.created| B{Cloud Function<br>onMembershipCreated}

    %% ───────────────────────────────────────────────────────
    %% STAGE 1 – VALIDATE + HOLD
    %% ───────────────────────────────────────────────────────
    B --> C(Find matching /referrals<br>by referredUserId)
    C -->|Found & status == TRIAL| D[Update referral.status ⇒ AWAITING_PAYMENT]
    D --> E[Write membershipStartDate<br>& subscriptionValue]
    E --> F[Set rewardHoldUntil = now + 7 days]
    F --> G{Start 7-day<br>scheduled check}

    %% ───────────────────────────────────────────────────────
    %% STAGE 2 – HOLD EXPIRES
    %% ───────────────────────────────────────────────────────
    G -->|At T+7d| H{Check membership<br>active & payment ok?}

    H -->|Yes| I[Mark referral.status ⇒ CONVERTED]
    I --> J[Increment totalConverted<br>on /referralCodes/{code}]
    J --> K[Create reward record<br>rewardStatus ⇒ PAYABLE]
    K --> L[Apply 50 % credit (member)<br>or start stacked payouts (biz)]
    L --> M[Send “You earned a reward!”<br>email / WhatsApp]

    H -->|No – cancelled or overdue| N[Mark referral.status ⇒ CANCELLED]
    N --> O[No reward generated; optional email to referrer]

    %% ───────────────────────────────────────────────────────
    %% STAGE 3 – LONG-TERM CANCELLATIONS
    %% ───────────────────────────────────────────────────────
    M --> P{Monthly job:<br>membership.cancelled}
    P -->|If cancellation < 3 mo & biz payout pending| Q[Stop future commission<br>Update rewardStatus ⇒ VOID]
```

### Flow at conversion time

```
ReferralService.confirmConversion()
        │
        └──▶ RewardService.createRewardsForConversion(referral)
                     │
                     ├─ For member → create 1 reward doc
                     └─ For business → create 3 reward docs
```

### RewardService responsabilities

Functions -- What it does

- CreateRewardsForConversion(referral) - Writes/rewards docs; status=scheduled
- processDueRewards() (daily cron) - Query rewards status=Scheduled & dueDate<=now. For each: _Ask OfficeRndService to add invoice credit or_ Ask BankPAyourServiuce to queue a transfer. * Mark reward processing -> paid (or failed).
- voidFutureRewards(referralId) - When a membership cancels in first 3 months:* Find future rewards with that referralId; set status="void".

### Cancellation trigger

```
1\.    OfficeRnd webhook → membership.cancelled
2\.    Cloud Function looks up referral by referredUserId.
3\.    If status == CONVERTED and cancel date < 90 days:
•    set referral.status = CANCELLED_EARLY
•    call RewardService.voidFutureRewards(referral.id)
```

(Member rewards already paid stay paid; business future commissions stop.)
