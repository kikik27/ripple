module ripple::campaign {
    use sui::table::{Self, Table};
    use sui::event;
    use ripple::access::AdminCap;

    // Error codes
    const EInvalidHashLength: u64 = 201;
    const EInvalidTargetRP: u64 = 202;
    const ECampaignPaused: u64 = 203;
    const EAlreadyClaimed: u64 = 204;

    /// Shared campaign object holding target/total RP, versioning, and per-wallet tracking.
    public struct Campaign has key {
        id: UID,
        version: u64,
        config_hash: vector<u8>,
        target_rp: u64,
        total_rp: u64,
        active: bool,
        is_demo: bool,
        issued_tickets: Table<address, ID>,
        claimed_addresses: Table<address, bool>,
    }

    /// Event emitted when an admin publishes a new campaign version.
    public struct CampaignPublished has copy, drop {
        campaign_id: ID,
        version: u64,
        config_hash: vector<u8>,
    }

    /// Admin entrypoint to publish an authoritative campaign version.
    public fun publish(
        _admin: &AdminCap,
        version: u64,
        config_hash: vector<u8>,
        target_rp: u64,
        is_demo: bool,
        ctx: &mut TxContext
    ) {
        assert!(config_hash.length() == 32, EInvalidHashLength);
        assert!(target_rp > 0, EInvalidTargetRP);

        let uid = object::new(ctx);
        let campaign_id = uid.to_inner();

        let campaign = Campaign {
            id: uid,
            version,
            config_hash,
            target_rp,
            total_rp: 0,
            active: true,
            is_demo,
            issued_tickets: table::new(ctx),
            claimed_addresses: table::new(ctx),
        };

        event::emit(CampaignPublished {
            campaign_id,
            version,
            config_hash,
        });

        transfer::share_object(campaign);
    }

    /// Pause campaign (no further claims or ticket issuance permitted).
    public fun pause(_admin: &AdminCap, campaign: &mut Campaign) {
        campaign.active = false;
    }

    /// Unpause campaign.
    public fun unpause(_admin: &AdminCap, campaign: &mut Campaign) {
        campaign.active = true;
    }

    public fun is_active(campaign: &Campaign): bool {
        campaign.active
    }

    public fun version(campaign: &Campaign): u64 {
        campaign.version
    }

    public fun total_rp(campaign: &Campaign): u64 {
        campaign.total_rp
    }

    public fun target_rp(campaign: &Campaign): u64 {
        campaign.target_rp
    }

    public fun is_claimed(campaign: &Campaign, wallet: address): bool {
        table::contains(&campaign.claimed_addresses, wallet)
    }

    public fun current_issued_ticket(campaign: &Campaign, wallet: address): Option<ID> {
        if (table::contains(&campaign.issued_tickets, wallet)) {
            option::some(*table::borrow(&campaign.issued_tickets, wallet))
        } else {
            option::none()
        }
    }

    /// Package-internal record of an issued claim ticket.
    /// Overwrites existing ticket ID if expired ticket replaced, ensuring only newest ticket is valid.
    public(package) fun record_issued_ticket(
        campaign: &mut Campaign,
        wallet: address,
        ticket_id: ID
    ) {
        assert!(campaign.active, ECampaignPaused);
        assert!(!table::contains(&campaign.claimed_addresses, wallet), EAlreadyClaimed);

        if (table::contains(&campaign.issued_tickets, wallet)) {
            let current = table::borrow_mut(&mut campaign.issued_tickets, wallet);
            *current = ticket_id;
        } else {
            table::add(&mut campaign.issued_tickets, wallet, ticket_id);
        };
    }

    /// Package-internal record of a claimed contribution.
    public(package) fun record_contribution(
        campaign: &mut Campaign,
        wallet: address,
        rp_amount: u64
    ) {
        assert!(campaign.active, ECampaignPaused);
        assert!(!table::contains(&campaign.claimed_addresses, wallet), EAlreadyClaimed);

        table::add(&mut campaign.claimed_addresses, wallet, true);
        campaign.total_rp = campaign.total_rp + rp_amount;
    }
}
