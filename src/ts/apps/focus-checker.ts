import {AreYouFocused} from "../module";

const foundryWindows: Array<Window> = [window];

let isFocused: boolean = true;

function emitFocusStatus() {
    const visibleWindow = foundryWindows.find((w) => w.document.visibilityState === "visible");
    if ((visibleWindow !== undefined) === isFocused)
        return;
    isFocused = !isFocused;
    game.socket.emit("module.are-you-focused", {"focus": isFocused, "userId": game.user.id});
    AreYouFocused.log("Emitting focus status", isFocused, visibleWindow);
}

Hooks.once("ready", () => {
    if (!game.user.isGM) {
        window.addEventListener("visibilitychange", emitFocusStatus);

        Hooks.on("PopOut:popout", (app: Application, popout: Window) => {
            foundryWindows.push(popout);
            popout.addEventListener("visibilitychange", emitFocusStatus);
        });

        Hooks.on("Popout:close", (app: Application, popout: Window) => { // Closed or popped in
            foundryWindows.splice(foundryWindows.indexOf(popout), 1);
        });
    } else { // GM
        game.socket.on("module.are-you-focused", ({focus, userId}: {focus: boolean, userId: string}) => {
            AreYouFocused.log("Received focus status", focus, "for user", userId);
            document.querySelector(`#player-list .player[data-user-id="${userId}"]`)?.classList.toggle("unfocused-player", !focus);
        });
    }
});
