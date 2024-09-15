<script lang="ts">
    import {DollarSignIcon} from "lucide-svelte";

    const suggestedDonationAmounts = [
        {amount: 1, url: "https://buy.stripe.com/test_eVaaGlcLTeYy7cs3cg"},
        {amount: 2, url: "https://buy.stripe.com/test_7sI9Ch9zH3fQ40g9AF"},
        {amount: 3, url: "https://buy.stripe.com/test_8wM5m13bj8Aa40g4gm"},
        {amount: 5, url: "https://buy.stripe.com/test_5kA5m1dPX7w6eEU14b"},
        {amount: 10, url: "https://buy.stripe.com/test_bIYg0F3bj17I8gweV3"},
        {amount: 15, url: "https://buy.stripe.com/test_dR66q56nv3fQ54k6ow"},
    ];
</script>

<div class="flex flex-col gap-4 w-full">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
        {#each suggestedDonationAmounts as donation}
            <a href="{donation.url}" target="_blank" class="btn btn-outline w-full">${donation.amount}</a>
        {/each}
    </div>
    <div class="pt-3">
        <a target="_blank" class="btn w-full btn-neutral" href="https://buy.stripe.com/test_9AQ5m16nv3fQeEU8wG"><DollarSignIcon/> Custom Amount</a>
    </div>
</div>