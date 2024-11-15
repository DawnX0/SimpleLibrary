import { ContextActionService, ReplicatedStorage, RunService, UserInputService } from "@rbxts/services";
import Remotes from "../Remotes";
import { ClientSenderEvent } from "@rbxts/net/out/client/ClientEvent";
import { ServerListenerEvent } from "@rbxts/net/out/server/ServerEvent";

export type ActionType = {
	Name: string;
	InputMethod: "ContextAction" | "UserInput";
	Gesture: Enum.KeyCode | Enum.UserInputType;
	ClientOnStart?: (player: Player) => void;
	ClientOnEnd?: (player: Player) => void;
	ServerOnStart?: (player: Player) => void;
	ServerOnEnd?: (player: Player) => void;
	TouchButton?: boolean;
};

const FOLDER_NAME = "Actions";

class Action {
	ActionRegistry: Map<string, ActionType> = new Map();
	clientLink: ClientSenderEvent<[string, boolean]> = Remotes.Client.Get("ActionLink");
	serverLink: ServerListenerEvent<[string, boolean]> = Remotes.Server.Get("ActionLink");

	constructor() {
		this.RegisterActions();
	}

	RegisterActions() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as ActionType;

					if (this.ActionRegistry.has(reqChild.Name.lower())) {
						error(`Action with name "${reqChild.Name}" already exists.`);
					}
					this.ActionRegistry.set(reqChild.Name.lower(), reqChild);
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	Listen(player?: Player) {
		if (RunService.IsClient()) {
			if (!player) error("Listen on client side must have the player passed.");

			this.ActionRegistry.forEach((action, name) => {
				const { Gesture, InputMethod, ClientOnStart, ClientOnEnd, TouchButton } = action;

				if (InputMethod === "ContextAction") {
					const wrap = (actionName: string, state: Enum.UserInputState, inputObject: InputObject) => {
						if (state === Enum.UserInputState.Begin && ClientOnStart) {
							ClientOnStart(player);
							try {
								this.clientLink.SendToServer(name, false);
							} catch (e) {
								error(`Failed to send remote event: ${e}`);
							}
						} else if (state === Enum.UserInputState.End && ClientOnEnd) {
							ClientOnEnd(player);
							try {
								this.clientLink.SendToServer(name, true);
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
					const { Name, InputMethod, Gesture, ClientOnStart } = action;
					const isGesture =
						input.KeyCode.Name.lower() === Gesture.Name.lower() ||
						input.UserInputType.Name.lower() === Gesture.Name.lower();

					if (InputMethod === "UserInput" && isGesture && ClientOnStart) {
						ClientOnStart(player);
						this.clientLink.SendToServer(Name, false);
					}
				});
			});

			UserInputService.InputEnded.Connect((input: InputObject, gameProcessed: boolean) => {
				if (gameProcessed) return;

				this.ActionRegistry.forEach((action) => {
					const { Name, InputMethod, Gesture, ClientOnEnd } = action;
					const isGesture =
						input.KeyCode.Name.lower() === Gesture.Name.lower() ||
						input.UserInputType.Name.lower() === Gesture.Name.lower();

					if (InputMethod === "UserInput" && isGesture && ClientOnEnd) {
						ClientOnEnd(player);
						this.clientLink.SendToServer(Name, true);
					}
				});
			});
		} else if (RunService.IsServer()) {
			this.serverLink.Connect((player: Player, name: string, ended: boolean) => {
				const action = this.ActionRegistry.get(name);
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
