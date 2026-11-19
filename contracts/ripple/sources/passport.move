module ripple::passport {
    use sui::table::{Self, Table};
    use sui::event;

    // Error codes
    const EPassportAlreadyRegistered: u64 = 101;

    /// Shared registry tracking player address to passport object ID.
    public struct PlayerRegistry has key {
        id: UID,
        passports: Table<address, ID>,
    }

    /// Soulbound player passport: has `key` only, NO `store`.
    /// Cannot be transferred or traded on an open marketplace.
    public struct Passport has key {
        id: UID,
        owner: address,
        total_xp: u64,
        completed_count: u64,
    }

    /// Event emitted when a user registers a new passport.
    public struct PassportRegistered has copy, drop {
        owner: address,
        passport_id: ID,
    }

    fun init(ctx: &mut TxContext) {
        let registry = PlayerRegistry {
            id: object::new(ctx),
            passports: table::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Register a single passport per address.
    public fun register(registry: &mut PlayerRegistry, ctx: &mut TxContext) {
        let sender = ctx.sender();
        assert!(!table::contains(&registry.passports, sender), EPassportAlreadyRegistered);

        let passport_uid = object::new(ctx);
        let passport_id = passport_uid.to_inner();

        let passport = Passport {
            id: passport_uid,
            owner: sender,
            total_xp: 0,
            completed_count: 0,
        };

        table::add(&mut registry.passports, sender, passport_id);

        event::emit(PassportRegistered {
            owner: sender,
            passport_id,
        });

        transfer::transfer(passport, sender);
    }

    public fun owner(passport: &Passport): address {
        passport.owner
    }

    public fun total_xp(passport: &Passport): u64 {
        passport.total_xp
    }

    public fun completed_count(passport: &Passport): u64 {
        passport.completed_count
    }

    public fun has_passport(registry: &PlayerRegistry, user: address): bool {
        table::contains(&registry.passports, user)
    }

    public fun get_passport_id(registry: &PlayerRegistry, user: address): ID {
        *table::borrow(&registry.passports, user)
    }

    /// Package-internal function to award XP and increment expedition completion count.
    public(package) fun award(passport: &mut Passport, xp_amount: u64) {
        passport.total_xp = passport.total_xp + xp_amount;
        passport.completed_count = passport.completed_count + 1;
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
