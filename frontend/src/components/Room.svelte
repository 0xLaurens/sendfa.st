<script lang="ts">
    import {onMount} from "svelte";
    let user: any

    onMount(() => {
        let socket = new WebSocket("ws://127.0.0.1:7331/api/websocket")
        socket.onmessage = (event) => {
            let data = JSON.parse(event.data)
            switch (data.type) {
                case "IDENTITY":
                    console.log(data.user)
                    user = data.user
                    RequestRoom(socket)
            }
        }
    })

    function RequestRoom(socket: WebSocket) {
        socket.send(JSON.stringify({
            type: "REQUEST_ROOM",
        }))
    }

</script>
<p>{user?.display_name}</p>