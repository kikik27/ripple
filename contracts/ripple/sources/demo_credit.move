module ripple::demo_credit {
    use sui::coin::{Self, TreasuryCap};

    /// One-time witness for DEMO_CREDIT testnet coin.
    public struct DEMO_CREDIT has drop {}

    #[allow(deprecated_usage)]
    fun init(witness: DEMO_CREDIT, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            0, // decimals = 0 for demo credit
            b"DEMO_CREDIT",
            b"Ripple Demo Credit",
            b"Testnet-only demo credit for Ripple vertical slice",
            option::none(),
            ctx
        );
        transfer::public_freeze_object(metadata);
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    public fun mint(
        treasury: &mut TreasuryCap<DEMO_CREDIT>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(DEMO_CREDIT {}, ctx);
    }
}
