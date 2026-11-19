module ripple::access {
    /// Capability granting admin privileges (campaign publish/pause, pool management).
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Capability granting verifier privileges (issuing claim tickets after replay verification).
    public struct VerifierCap has key, store {
        id: UID,
    }

    fun init(ctx: &mut TxContext) {
        let admin = AdminCap {
            id: object::new(ctx),
        };
        let verifier = VerifierCap {
            id: object::new(ctx),
        };
        transfer::public_transfer(admin, ctx.sender());
        transfer::public_transfer(verifier, ctx.sender());
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
