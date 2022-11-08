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
        window.addEventListener("visibilitychange", emitFocusStatus);
        window.addEventListener("focus", emitFocusStatus);
        window.addEventListener("blur", emitFocusStatus);

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
        game.socket.on("module.are-you-focused", ({visible, focus, userId}: {visible: boolean, focus: boolean, userId: string}) => {
            AreYouFocused.log("Received focus status", focus, "for user", userId);
            const playerEl = document.querySelector(`#player-list .player[data-user-id="${userId}"]`) as HTMLElement;
            playerEl.classList.toggle("unfocused-player", !focus);
            playerEl.classList.toggle("no-visibility-player", !visible);
        });
    }
});
