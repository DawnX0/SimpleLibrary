import { ContextActionService, ReplicatedStorage, RunService, UserInputService } from "@rbxts/services";
import Remotes from "./Remotes";
import { ClientSenderEvent } from "@rbxts/net/out/client/ClientEvent";
import { ServerListenerEvent } from "@rbxts/net/out/server/ServerEvent";
import { CheckAttributes } from "../Utility/CheckAttributes";

export type ActionType = {
	Name: string;
	InputMethod: "ContextAction" | "UserInput";
	Gesture: Enum.KeyCode | Enum.UserInputType;
	ClientOnStart?: (player: Player) => void;
	ClientOnEnd?: (player: Player) => void;
	ServerOnStart?: (player: Player) => void;
	ServerOnEnd?: (player: Player) => void;
	TouchButton?: boolean;
	DoubleTap?: boolean;
	DoubleTapThreshold?: number;
	Throttle?: number;
	Restricitons?: string[];
};

const FOLDER_NAME = "Actions";

class Action {
	ActionRegistry: Map<string, ActionType> = new Map();
	clientLink: ClientSenderEvent<[string, boolean]> | undefined = RunService.IsClient()
		? Remotes.Client.Get("ActionLink")
		: undefined;
	serverLink: ServerListenerEvent<[string, boolean]> | undefined = RunService.IsServer()
		? Remotes.Server.Get("ActionLink")
		: undefined;

	lastTapTime: Map<string, number> | undefined = RunService.IsClient() ? new Map() : undefined;
	doubleTapped: Map<string, boolean> | undefined = RunService.IsClient() ? new Map() : undefined;
	defaultDoubleTapThreshold: number = 0.5;

	constructor() {
		this.RegisterActions();
	}

	isThrottled(player: Player, actionName: string, throttle: number | undefined): boolean {
		if (!throttle) return false;
		const lastTapTime = this.lastTapTime?.get(player.Name + actionName);
		return lastTapTime !== undefined && tick() - lastTapTime < throttle;
	}

	RegisterActions() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as ActionType;

					try {
						if (this.ActionRegistry.get(reqChild.Name.lower())) {
							error(`"${reqChild.Name}" already exists.`);
						}
						this.ActionRegistry.set(reqChild.Name.lower(), reqChild);
					} catch (e) {
						warn(`code execution stopped: ${child.Name} is an empty file found in ${FOLDER_NAME}`);
						return;
					}
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	Listen(player?: Player) {
		if (RunService.IsClient()) {
			if (!player) error("Listen on client side must have the player passed.");

			this.ActionRegistry.forEach((action, name) => {
				const { Name, Gesture, InputMethod, ClientOnStart, ClientOnEnd, TouchButton, Restricitons } = action;

				if (Restricitons && player.Character && CheckAttributes(player.Character, Restricitons)) {
					print("restricted");
					return;
				}

				this.isThrottled(player, Name, action.Throttle);

				if (InputMethod === "ContextAction") {
					const wrap = (actionName: string, state: Enum.UserInputState, inputObject: InputObject) => {
						if (state === Enum.UserInputState.Begin && ClientOnStart) {
							ClientOnStart(player);
							try {
								this.clientLink!.SendToServer(name, false);
							} catch (e) {
								error(`Failed to send remote event: ${e}`);
							}
						} else if (state === Enum.UserInputState.End && ClientOnEnd) {
							ClientOnEnd(player);
							try {
								this.clientLink!.SendToServer(name, true);
							} catch (e) {
								error(`Failed to send remote event: ${e}`);
							}
						}
					};

					ContextActionService.BindAction(name, wrap, TouchButton || false, Gesture);
				}
			});

			UserInputService.InputBegan.Connect((input: InputObject, gameProcessed: boolean) => {
				if (gameProcessed) return;

				this.ActionRegistry.forEach((action) => {
					const { Name, InputMethod, Gesture, ClientOnStart, DoubleTap, DoubleTapThreshold, Restricitons } =
						action;

					if (Restricitons && player.Character && CheckAttributes(player.Character, Restricitons)) {
						print("restricted");
						return;
					}

					this.isThrottled(player, Name, action.Throttle);

					const isGesture =
						input.KeyCode.Name.lower() === Gesture.Name.lower() ||
						input.UserInputType.Name.lower() === Gesture.Name.lower();

					if (InputMethod === "UserInput" && isGesture && ClientOnStart) {
						if (DoubleTap) {
							const lastTapTime = this.lastTapTime!.get(player.Name + Name) || 0;
							const doubleTapThreshold = DoubleTapThreshold || this.defaultDoubleTapThreshold;

							if (tick() - lastTapTime <= doubleTapThreshold) {
								ClientOnStart(player);
								this.clientLink!.SendToServer(Name, false);
								this.doubleTapped!.set(player.Name + Name, true);
								return;
							}

							this.lastTapTime!.set(player.Name + Name, tick());
						} else {
							ClientOnStart(player);
							this.clientLink!.SendToServer(Name, false);
						}
					}
				});
			});

			UserInputService.InputEnded.Connect((input: InputObject, gameProcessed: boolean) => {
				if (gameProcessed) return;

				this.ActionRegistry.forEach((action) => {
					const { Name, InputMethod, Gesture, ClientOnEnd, DoubleTap, DoubleTapThreshold } = action;

					this.isThrottled(player, Name, action.Throttle);

					const isGesture =
						input.KeyCode.Name.lower() === Gesture.Name.lower() ||
						input.UserInputType.Name.lower() === Gesture.Name.lower();

					if (InputMethod === "UserInput" && isGesture && ClientOnEnd) {
						const doubleTapped = this.doubleTapped!.get(player.Name + Name);
						if (DoubleTap && doubleTapped === true) {
							ClientOnEnd(player);
							this.clientLink!.SendToServer(Name, true);
							this.doubleTapped!.delete(player.Name + Name);
						} else {
							ClientOnEnd(player);
							this.clientLink!.SendToServer(Name, true);
						}
					}
				});
			});
		} else if (RunService.IsServer()) {
			this.serverLink!.Connect((player: Player, name: string, ended: boolean) => {
				const action = this.ActionRegistry.get(name.lower());
				if (action) {
					if (!ended && action.ServerOnStart) {
						action.ServerOnStart(player);
					} else if (ended && action.ServerOnEnd) {
						action.ServerOnEnd(player);
					}
				}
			});
		}
	}
}

export default new Action();
