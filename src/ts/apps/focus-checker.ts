import {AreYouFocused} from "../module";

const foundryWindows: Array<Window> = [window];

let isVisible: boolean = true;
let isFocused: boolean = true;

function emitFocusStatus() {
    const visibleWindow = foundryWindows.find((w) => w.document.visibilityState === "visible");
    const focusedWindow = foundryWindows.find((w) => w.document.hasFocus());
    let isNowFocused = focusedWindow !== undefined;
    let isNowVisible = visibleWindow !== undefined;
    if (isNowFocused !== isFocused && isNowVisible !== isVisible) // Don't emit if nothing changed
        return;
    isVisible = isNowVisible;
    isFocused = isNowFocused;
    game.socket.emit("module.are-you-focused", {"visible": isVisible, "focus": isFocused, "userId": game.user.id});
    AreYouFocused.log("Emitting focus status", isVisible, visibleWindow);
}

Hooks.once("ready", () => {
    if (!game.user.isGM) {
        emitFocusStatus();
        window.addEventListener("visibilitychange", emitFocusStatus);
        window.addEventListener("focus", emitFocusStatus);
        window.addEventListener("blur", emitFocusStatus);

        game.socket.on("module.are-you-focused", ({ request } : { request: boolean }) => {
            if (request) emitFocusStatus();
        });

        Hooks.on("PopOut:popout", (app: Application, popout: Window) => {
            foundryWindows.push(popout);
            popout.addEventListener("visibilitychange", emitFocusStatus);
            popout.addEventListener("focus", emitFocusStatus);
            popout.addEventListener("blur", emitFocusStatus);
        });

        Hooks.on("Popout:close", (app: Application, popout: Window) => { // Closed or popped in
            foundryWindows.splice(foundryWindows.indexOf(popout), 1);
        });
    } else { // GM
        let playerStatuses = new Map<string, { visible: boolean, focus: boolean }>();

        function processPlayerList() {
            document.getElementById("player-list").classList.toggle("player-list--gm-view", true);
            document.querySelector(`#player-list .player[data-user-id="${game.user.id}"]`).classList.toggle("tracked-player", true);
            for (const [userId, status] of playerStatuses) {
                const player = document.querySelector(`#player-list .player[data-user-id="${userId}"]`);
                if (player) {
                    player.classList.toggle("tracked-player", true);
                    player.classList.toggle("unfocused-player", !status.focus);
                    player.classList.toggle("no-visibility-player", !status.visible);
                } else
                    playerStatuses.delete(userId);
            }
        }
        processPlayerList()
        Hooks.on("renderPlayerList", processPlayerList); // Player list re-renders every player join, clearing all data


        game.socket.on("module.are-you-focused", ({visible, focus, userId}: {visible: boolean, focus: boolean, userId: string}) => {
            if (!userId) return; // request
            AreYouFocused.log("Received focus status", focus, "for user", userId);
            const playerEl = document.querySelector(`#player-list .player[data-user-id="${userId}"]`) as HTMLElement;
            playerEl.classList.toggle("unfocused-player", !focus);
            playerEl.classList.toggle("no-visibility-player", !visible);
            playerEl.classList.toggle("tracked-player", true);
            playerStatuses.set(userId, {visible, focus});
        });

        game.socket.emit("module.are-you-focused", { request: true });
    }
});
