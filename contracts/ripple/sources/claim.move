module ripple::claim {
    use sui::event;
    use sui::clock::Clock;
    use ripple::access::VerifierCap;
    use ripple::campaign::{Self, Campaign};
    use ripple::passport::{Self, Passport};

    // Error codes
    const EInvalidHashLength: u64 = 301;
    const EInvalidExpiry: u64 = 302;
    const ECampaignPaused: u64 = 303;
    const EAlreadyClaimed: u64 = 304;
    const ENotTicketOwner: u64 = 305;
    const EPassportOwnerMismatch: u64 = 306;
    const ECampaignMismatch: u64 = 307;
    const EVersionMismatch: u64 = 308;
    const ETicketExpired: u64 = 309;
    const EStaleTicket: u64 = 310;

    // Fixed rewards (P0 specification)
    const FIXED_XP_REWARD: u64 = 100;
    const FIXED_RP_REWARD: u64 = 100;

    /// Owned ClaimTicket: `key` only, NO `store`. Nontransferable.
    public struct ClaimTicket has key {
        id: UID,
        wallet: address,
        campaign_id: ID,
        version: u64,
        replay_hash: vector<u8>,
        xp_reward: u64,
        rp_reward: u64,
        expires_at_ms: u64,
    }

    /// Event emitted when verifier capability issues a claim ticket.
    public struct TicketIssued has copy, drop {
        wallet: address,
        campaign_id: ID,
        ticket_id: ID,
        replay_hash: vector<u8>,
    }

    /// Event emitted upon successful ticket claim.
    public struct ContributionRecorded has copy, drop {
        wallet: address,
        campaign_id: ID,
        version: u64,
        xp: u64,
        rp: u64,
        replay_hash: vector<u8>,
        total_rp: u64,
    }

    /// Verifier capability entrypoint to issue a claim ticket after off-chain replay verification.
    public fun issue(
        _verifier: &VerifierCap,
        campaign: &mut Campaign,
        wallet: address,
        replay_hash: vector<u8>,
        expires_at_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(campaign::is_active(campaign), ECampaignPaused);
        assert!(replay_hash.length() == 32, EInvalidHashLength);
        assert!(expires_at_ms > clock.timestamp_ms(), EInvalidExpiry);
        assert!(!campaign::is_claimed(campaign, wallet), EAlreadyClaimed);

        let uid = object::new(ctx);
        let ticket_id = uid.to_inner();
        let campaign_id = object::id(campaign);

        campaign::record_issued_ticket(campaign, wallet, ticket_id);

        let ticket = ClaimTicket {
            id: uid,
            wallet,
            campaign_id,
            version: campaign::version(campaign),
            replay_hash,
            xp_reward: FIXED_XP_REWARD,
            rp_reward: FIXED_RP_REWARD,
            expires_at_ms,
        };

        event::emit(TicketIssued {
            wallet,
            campaign_id,
            ticket_id,
            replay_hash,
        });

        transfer::transfer(ticket, wallet);
    }

    /// Player entrypoint to claim their verified ticket.
    /// Atomically consumes ticket, increments XP on Passport, increments RP on Campaign,
    /// and records the wallet as claimed to prevent replay.
    public fun claim(
        ticket: ClaimTicket,
        passport: &mut Passport,
        campaign: &mut Campaign,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();

        // Ownership and caller binding
        assert!(sender == ticket.wallet, ENotTicketOwner);
        assert!(passport::owner(passport) == ticket.wallet, EPassportOwnerMismatch);

        // Campaign identity and active status
        assert!(object::id(campaign) == ticket.campaign_id, ECampaignMismatch);
        assert!(campaign::version(campaign) == ticket.version, EVersionMismatch);
        assert!(campaign::is_active(campaign), ECampaignPaused);

        // Expiry check
        assert!(clock.timestamp_ms() <= ticket.expires_at_ms, ETicketExpired);

        // Ticket must match the current issued ticket ID (prevents re-use of replaced/old tickets)
        let active_ticket = campaign::current_issued_ticket(campaign, ticket.wallet);
        assert!(active_ticket == option::some(object::id(&ticket)), EStaleTicket);

        // Update campaign RP and record claimed status
        campaign::record_contribution(campaign, ticket.wallet, ticket.rp_reward);

        // Update passport XP and expedition count
        passport::award(passport, ticket.xp_reward);

        // Emit verified impact contribution event
        event::emit(ContributionRecorded {
            wallet: ticket.wallet,
            campaign_id: ticket.campaign_id,
            version: ticket.version,
            xp: ticket.xp_reward,
            rp: ticket.rp_reward,
            replay_hash: ticket.replay_hash,
            total_rp: campaign::total_rp(campaign),
        });

        // Destroy consumed ticket
        let ClaimTicket {
            id,
            wallet: _,
            campaign_id: _,
            version: _,
            replay_hash: _,
            xp_reward: _,
            rp_reward: _,
            expires_at_ms: _,
        } = ticket;
        id.delete();
    }
}
