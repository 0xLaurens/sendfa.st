<script lang="ts">
    import {SmileIcon} from "lucide-svelte";
    import type {User} from "../types/user.ts";

    export let user: User | undefined;
</script>

<div class="card card-bordered card-compact bg-base-100 w-36">
    <div class="card-body">
        <div class="flex flex-col items-center space-y-3">
            <div class="rounded-full">
                <SmileIcon class="h-16 w-16"/>
            </div>
            <div class="text-center">
                <p class="text-lg font-semibold">{user ? user.display_name : "Username"}</p>
                <p class="text-gray-500 text-sm">{user ? user.device_name : "Device"}</p>
            </div>
        </div>
    </div>
</div>