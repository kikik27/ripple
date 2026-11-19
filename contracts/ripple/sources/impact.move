module ripple::impact {
    use sui::coin::{Self, Coin};
    use sui::balance::Balance;
    use sui::event;
    use sui::clock::Clock;
    use ripple::access::AdminCap;
    use ripple::campaign::{Self, Campaign};

    // Error codes
    const EZeroAddress: u64 = 401;
    const EInsufficientFunds: u64 = 402;
    const ECampaignMismatch: u64 = 403;
    const EPoolAlreadySettled: u64 = 404;
    const EThresholdNotReached: u64 = 405;
    const EDeadlinePassed: u64 = 406;
    const EDeadlineNotReached: u64 = 407;
    const EZeroReleaseAmount: u64 = 408;

    /// Shared sponsor pool holding escrowed funds for a verified milestone release.
    public struct SponsorPool<phantom T> has key {
        id: UID,
        campaign_id: ID,
        sponsor: address,
        recipient: address,
        balance: Balance<T>,
        threshold_rp: u64,
        release_amount: u64,
        deadline_ms: u64,
        released: bool,
        cancelled: bool,
    }

    /// Event emitted when a sponsor funds a pool.
    public struct PoolFunded has copy, drop {
        pool_id: ID,
        campaign_id: ID,
        sponsor: address,
        recipient: address,
        amount: u64,
    }

    /// Event emitted when admin executes milestone release to the immutable recipient.
    public struct MilestoneReleased has copy, drop {
        pool_id: ID,
        campaign_id: ID,
        amount: u64,
        recipient: address,
        total_rp: u64,
    }

    /// Event emitted when an expired unreleased pool is refunded to original sponsor.
    public struct PoolRefunded has copy, drop {
        pool_id: ID,
        sponsor: address,
        amount: u64,
    }

    /// Admin entrypoint to create and fund a sponsor pool.
    public fun create_pool<T>(
        _admin: &AdminCap,
        campaign: &Campaign,
        funds: Coin<T>,
        recipient: address,
        threshold_rp: u64,
        release_amount: u64,
        deadline_ms: u64,
        ctx: &mut TxContext
    ) {
        assert!(recipient != @0x0, EZeroAddress);
        assert!(release_amount > 0, EZeroReleaseAmount);
        let funded_amount = funds.value();
        assert!(funded_amount >= release_amount, EInsufficientFunds);

        let uid = object::new(ctx);
        let pool_id = uid.to_inner();
        let campaign_id = object::id(campaign);
        let sponsor = ctx.sender();

        let pool = SponsorPool<T> {
            id: uid,
            campaign_id,
            sponsor,
            recipient,
            balance: funds.into_balance(),
            threshold_rp,
            release_amount,
            deadline_ms,
            released: false,
            cancelled: false,
        };

        event::emit(PoolFunded {
            pool_id,
            campaign_id,
            sponsor,
            recipient,
            amount: funded_amount,
        });

        transfer::share_object(pool);
    }

    /// Admin entrypoint to release milestone to the immutable recipient once community RP threshold is achieved.
    public fun release_milestone<T>(
        _admin: &AdminCap,
        pool: &mut SponsorPool<T>,
        campaign: &Campaign,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(object::id(campaign) == pool.campaign_id, ECampaignMismatch);
        assert!(!pool.released && !pool.cancelled, EPoolAlreadySettled);
        assert!(campaign::total_rp(campaign) >= pool.threshold_rp, EThresholdNotReached);
        assert!(clock.timestamp_ms() <= pool.deadline_ms, EDeadlinePassed);
        assert!(pool.balance.value() >= pool.release_amount, EInsufficientFunds);

        pool.released = true;
        let released_balance = pool.balance.split(pool.release_amount);
        let payout_coin = coin::from_balance(released_balance, ctx);

        event::emit(MilestoneReleased {
            pool_id: object::id(pool),
            campaign_id: pool.campaign_id,
            amount: pool.release_amount,
            recipient: pool.recipient,
            total_rp: campaign::total_rp(campaign),
        });

        transfer::public_transfer(payout_coin, pool.recipient);
    }

    /// Admin entrypoint to refund sponsor if deadline expires before milestone threshold is achieved.
    public fun cancel_or_refund<T>(
        _admin: &AdminCap,
        pool: &mut SponsorPool<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!pool.released && !pool.cancelled, EPoolAlreadySettled);
        assert!(clock.timestamp_ms() > pool.deadline_ms, EDeadlineNotReached);

        pool.cancelled = true;
        let refund_amount = pool.balance.value();
        let refund_coin = coin::from_balance(pool.balance.withdraw_all(), ctx);

        event::emit(PoolRefunded {
            pool_id: object::id(pool),
            sponsor: pool.sponsor,
            amount: refund_amount,
        });

        transfer::public_transfer(refund_coin, pool.sponsor);
    }

    // Read getters
    public fun is_released<T>(pool: &SponsorPool<T>): bool {
        pool.released
    }

    public fun is_cancelled<T>(pool: &SponsorPool<T>): bool {
        pool.cancelled
    }

    public fun escrow_balance<T>(pool: &SponsorPool<T>): u64 {
        pool.balance.value()
    }

    public fun recipient<T>(pool: &SponsorPool<T>): address {
        pool.recipient
    }

    public fun threshold_rp<T>(pool: &SponsorPool<T>): u64 {
        pool.threshold_rp
    }
}
