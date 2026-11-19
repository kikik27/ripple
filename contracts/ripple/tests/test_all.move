#[test_only]
module ripple::test_all {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock;
    use sui::coin::{Self, TreasuryCap};
    use ripple::access::{Self, AdminCap, VerifierCap};
    use ripple::demo_credit::{Self, DEMO_CREDIT};
    use ripple::passport::{Self, PlayerRegistry, Passport};
    use ripple::campaign::{Self, Campaign};
    use ripple::claim::{Self, ClaimTicket};
    use ripple::impact::{Self, SponsorPool};

    const ADMIN: address = @0xAD;
    const SPONSOR: address = @0x50;
    const PLAYER_ALICE: address = @0xA11CE;
    const PLAYER_BOB: address = @0xB0B;
    const RECIPIENT: address = @0xCAFE;

    fun dummy_hash(): vector<u8> {
        b"12345678901234567890123456789012" // 32 bytes
    }

    fun setup(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            access::init_for_testing(ts::ctx(scenario));
            passport::init_for_testing(ts::ctx(scenario));
            demo_credit::init_for_testing(ts::ctx(scenario));
        };
    }

    #[test]
    fun test_passport_registration_success() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // Player Alice registers passport
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            assert!(!passport::has_passport(&registry, PLAYER_ALICE), 0);

            passport::register(&mut registry, ts::ctx(&mut scenario));
            assert!(passport::has_passport(&registry, PLAYER_ALICE), 1);

            ts::return_shared(registry);
        };

        // Check passport values
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let passport = ts::take_from_sender<Passport>(&scenario);
            assert!(passport::owner(&passport) == PLAYER_ALICE, 2);
            assert!(passport::total_xp(&passport) == 0, 3);
            assert!(passport::completed_count(&passport) == 0, 4);
            ts::return_to_sender(&scenario, passport);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 101, location = ripple::passport)]
    fun test_passport_duplicate_registration_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            // Second registration must abort with EPassportAlreadyRegistered (101)
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_campaign_publishing_and_pause() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // Admin publishes campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(
                &admin_cap,
                1,
                dummy_hash(),
                500, // target RP
                true,
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Check campaign is shared and active
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let campaign = ts::take_shared<Campaign>(&scenario);
            assert!(campaign::is_active(&campaign), 0);
            assert!(campaign::version(&campaign) == 1, 1);
            assert!(campaign::target_rp(&campaign) == 500, 2);
            assert!(campaign::total_rp(&campaign) == 0, 3);
            ts::return_shared(campaign);
        };

        // Admin pauses campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            campaign::pause(&admin_cap, &mut campaign);
            assert!(!campaign::is_active(&campaign), 4);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Admin unpauses campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            campaign::unpause(&admin_cap, &mut campaign);
            assert!(campaign::is_active(&campaign), 5);
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_ticket_issue_and_claim_atomic_rewards() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // 1. Publish campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(
                &admin_cap,
                1,
                dummy_hash(),
                500,
                true,
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, admin_cap);
        };

        // 2. Register Alice passport
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        // 3. Issue ClaimTicket to Alice via VerifierCap
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock.set_for_testing(1000);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);

            claim::issue(
                &verifier_cap,
                &mut campaign,
                PLAYER_ALICE,
                dummy_hash(),
                2000, // expires at ms 2000
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, verifier_cap);
        };

        // 4. Alice claims ticket with passport
        clock.set_for_testing(1500); // valid time before 2000 ms

        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let ticket = ts::take_from_sender<ClaimTicket>(&scenario);
            let mut passport = ts::take_from_sender<Passport>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);

            claim::claim(
                ticket,
                &mut passport,
                &mut campaign,
                &clock,
                ts::ctx(&mut scenario)
            );

            // Verified state: 100 XP awarded to passport, 100 RP awarded to campaign
            assert!(passport::total_xp(&passport) == 100, 10);
            assert!(passport::completed_count(&passport) == 1, 11);
            assert!(campaign::total_rp(&campaign) == 100, 12);
            assert!(campaign::is_claimed(&campaign, PLAYER_ALICE), 13);

            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, passport);
        };

        clock.destroy_for_testing();
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 309, location = ripple::claim)]
    fun test_claim_expired_ticket_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // Publish campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(&admin_cap, 1, dummy_hash(), 500, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Register passport
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        // Issue ticket expiring at 2000 ms
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock.set_for_testing(1000);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            claim::issue(
                &verifier_cap,
                &mut campaign,
                PLAYER_ALICE,
                dummy_hash(),
                2000,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, verifier_cap);
        };

        // Advance clock past expiration
        clock.set_for_testing(2500);

        // Alice tries to claim after expiry -> must abort with ETicketExpired (309)
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let ticket = ts::take_from_sender<ClaimTicket>(&scenario);
            let mut passport = ts::take_from_sender<Passport>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);

            claim::claim(
                ticket,
                &mut passport,
                &mut campaign,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, passport);
        };

        clock.destroy_for_testing();
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 305, location = ripple::claim)]
    fun test_claim_ticket_wrong_sender_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(&admin_cap, 1, dummy_hash(), 500, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
        };

        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, PLAYER_BOB);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, ADMIN);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            claim::issue(
                &verifier_cap,
                &mut campaign,
                PLAYER_ALICE,
                dummy_hash(),
                5000,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, verifier_cap);
        };

        // Bob attempts to claim Alice's ticket with Bob's passport -> aborts with ENotTicketOwner (305)
        ts::next_tx(&mut scenario, PLAYER_BOB);
        {
            let ticket = ts::take_from_address<ClaimTicket>(&scenario, PLAYER_ALICE);
            let mut bob_passport = ts::take_from_sender<Passport>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);

            claim::claim(
                ticket,
                &mut bob_passport,
                &mut campaign,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, bob_passport);
        };

        clock.destroy_for_testing();
        ts::end(scenario);
    }

    #[test]
    fun test_impact_pool_funding_and_milestone_release() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // 1. Publish campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(&admin_cap, 1, dummy_hash(), 500, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
        };

        // 2. Mint 25 DEMO_CREDIT and create sponsor pool
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<DEMO_CREDIT>>(&scenario);
            demo_credit::mint(&mut treasury, 25, SPONSOR, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, treasury);
        };

        ts::next_tx(&mut scenario, SPONSOR);
        {
            let coin = ts::take_from_sender<sui::coin::Coin<DEMO_CREDIT>>(&scenario);
            let admin_cap = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let campaign = ts::take_shared<Campaign>(&scenario);

            // Pool requires 100 RP threshold, releases 25 DEMO_CREDIT, deadline at 10000 ms
            impact::create_pool(
                &admin_cap,
                &campaign,
                coin,
                RECIPIENT,
                100, // threshold 100 RP
                25,  // release amount 25
                10000, // deadline
                ts::ctx(&mut scenario)
            );

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        // 3. Register Alice and claim 100 RP contribution
        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let mut registry = ts::take_shared<PlayerRegistry>(&scenario);
            passport::register(&mut registry, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        clock.set_for_testing(1000);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            claim::issue(
                &verifier_cap,
                &mut campaign,
                PLAYER_ALICE,
                dummy_hash(),
                5000,
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, verifier_cap);
        };

        ts::next_tx(&mut scenario, PLAYER_ALICE);
        {
            let ticket = ts::take_from_sender<ClaimTicket>(&scenario);
            let mut passport = ts::take_from_sender<Passport>(&scenario);
            let mut campaign = ts::take_shared<Campaign>(&scenario);
            claim::claim(ticket, &mut passport, &mut campaign, &clock, ts::ctx(&mut scenario));
            ts::return_shared(campaign);
            ts::return_to_sender(&scenario, passport);
        };

        // 4. Admin executes milestone release to immutable recipient
        clock.set_for_testing(2000);

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pool = ts::take_shared<SponsorPool<DEMO_CREDIT>>(&scenario);
            let campaign = ts::take_shared<Campaign>(&scenario);

            assert!(!impact::is_released(&pool), 20);
            assert!(impact::escrow_balance(&pool) == 25, 21);

            impact::release_milestone(
                &admin_cap,
                &mut pool,
                &campaign,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(impact::is_released(&pool), 22);
            assert!(impact::escrow_balance(&pool) == 0, 23);

            ts::return_shared(campaign);
            ts::return_shared(pool);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // 5. Verify recipient received exactly 25 DEMO_CREDIT
        ts::next_tx(&mut scenario, RECIPIENT);
        {
            let payout = ts::take_from_sender<sui::coin::Coin<DEMO_CREDIT>>(&scenario);
            assert!(coin::value(&payout) == 25, 30);
            ts::return_to_sender(&scenario, payout);
        };

        clock.destroy_for_testing();
        ts::end(scenario);
    }

    #[test]
    fun test_impact_pool_refund_after_deadline() {
        let mut scenario = ts::begin(ADMIN);
        setup(&mut scenario);

        // Publish campaign
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            campaign::publish(&admin_cap, 1, dummy_hash(), 500, true, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Mint 25 and create pool with deadline 5000 ms
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<DEMO_CREDIT>>(&scenario);
            demo_credit::mint(&mut treasury, 25, SPONSOR, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, treasury);
        };

        ts::next_tx(&mut scenario, SPONSOR);
        {
            let coin = ts::take_from_sender<sui::coin::Coin<DEMO_CREDIT>>(&scenario);
            let admin_cap = ts::take_from_address<AdminCap>(&scenario, ADMIN);
            let campaign = ts::take_shared<Campaign>(&scenario);

            impact::create_pool(
                &admin_cap,
                &campaign,
                coin,
                RECIPIENT,
                500, // threshold 500 RP (not reached)
                25,
                5000, // deadline 5000 ms
                ts::ctx(&mut scenario)
            );

            ts::return_shared(campaign);
            ts::return_to_address(ADMIN, admin_cap);
        };

        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        // Clock exceeds deadline
        clock.set_for_testing(6000);

        // Admin triggers refund to sponsor
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            let mut pool = ts::take_shared<SponsorPool<DEMO_CREDIT>>(&scenario);

            assert!(!impact::is_cancelled(&pool), 40);
            impact::cancel_or_refund(&admin_cap, &mut pool, &clock, ts::ctx(&mut scenario));
            assert!(impact::is_cancelled(&pool), 41);
            assert!(impact::escrow_balance(&pool) == 0, 42);

            ts::return_shared(pool);
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Verify sponsor received refund of 25 DEMO_CREDIT
        ts::next_tx(&mut scenario, SPONSOR);
        {
            let refund = ts::take_from_sender<sui::coin::Coin<DEMO_CREDIT>>(&scenario);
            assert!(coin::value(&refund) == 25, 43);
            ts::return_to_sender(&scenario, refund);
        };

        clock.destroy_for_testing();
        ts::end(scenario);
    }
}
