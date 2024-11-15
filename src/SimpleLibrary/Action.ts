import { ContextActionService, ReplicatedStorage, RunService, UserInputService } from "@rbxts/services";
import Remotes from "../Remotes";
import { ClientSenderEvent } from "@rbxts/net/out/client/ClientEvent";

export type ActionType = {
	Name: string;
	InputMethod: "ContextAction" | "UserInput";
	Gesture: Enum.KeyCode | Enum.UserInputType;
	ClientOnStart?: (player: Player) => void;
	ClientOnEnd?: (player: Player) => void;
	ServerOnStart: (player: Player) => void;
	ServerOnEnd?: (player: Player) => void;
	TouchButton?: boolean;
	AdditonalArguments?: { [key: string]: AttributeValue };
};

const FOLDER_NAME = "Actions";
const LINK_NAME = "ActionLink";

class Action {
	ActionRegistry: Map<string, ActionType> = new Map();
	link?: ClientSenderEvent<[string, ActionType]>;

	constructor() {}

	RegisterActions() {
		const actionFolder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (actionFolder) {
			this.link = Remotes.Client.Get("ActionLink");

			for (const child of actionFolder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const action = require(child) as ActionType;

					if (this.ActionRegistry.has(action.Name.lower())) {
						error(`Action with name "${action.Name}" already exists.`);
					}
					this.ActionRegistry.set(action.Name.lower(), action);
				}
			}
		} else error("Could not find action folder");
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
								this.link?.SendToServer(name, action);
							} catch (e) {
								error(`Failed to send remote event: ${e}`);
							}
						} else if (state === Enum.UserInputState.End && ClientOnEnd) {
							ClientOnEnd(player);
							try {
								this.link?.SendToServer(name, action);
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
						this.link?.SendToServer(Name);
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

					if (InputMethod === "UserInput" && ClientOnEnd && isGesture) {
						ClientOnEnd(player);
						link.FireServer(Name, true);
					}
				});
			});
		} else if (RunService.IsServer()) {
			this.link?.OnServerEvent.Connect(onMessageReceived);
		}
	}
}

export default new Action();
