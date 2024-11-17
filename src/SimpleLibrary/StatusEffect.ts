import { ReplicatedStorage } from "@rbxts/services";
import Timer, { TimerState, TimerType } from "./Timer";

export type StatusEffectType = {
	Name: string;
	Duration: number;
	Tick: number;
	Stackable?: boolean;
	MaxStacks?: number;
	StatusAttributes?: string[];
	Modifiers?: Map<string, string>;

	OnExpired: <T>(arg: T) => void;
	OnTick: <T, R>(arg: T, RemainingTime: R) => void;
};

const FOLDER_NAME = "StatusEffects";

class StatusEffect {
	StatusEffectRegistry: Map<string, StatusEffectType> = new Map();
	AppliedEffectRegistry: Map<string, { [key: string]: TimerType }> = new Map();

	constructor() {
		this.RegisterStatusEffects();
	}

	RegisterStatusEffects() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as StatusEffectType;

					try {
						if (this.StatusEffectRegistry.get(reqChild.Name.lower())) {
							error(`"${reqChild.Name}" already exists.`);
						}
						this.StatusEffectRegistry.set(reqChild.Name.lower(), reqChild);
					} catch (e) {
						error(`code execution stopped: ${child.Name} is an empty file found in ${FOLDER_NAME}`);
						return;
					}
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	ApplyStatusEffect<T>(arg_0: T, UID: string, effectName: string) {
		if (this.StatusEffectRegistry.has(effectName.lower())) {
			const effect = this.StatusEffectRegistry.get(effectName.lower())!;

			const task = Timer.Create({
				Name: effect.Name,
				Duration: effect.Duration,
				Tick: effect.Tick,
				OnTick: effect.OnTick ? (remainingTime) => effect.OnTick(arg_0, remainingTime) : undefined,
				OnExpired: effect.OnExpired
					? () => {
							if (effect.StatusAttributes) {
								const char = arg_0 as Model;
								if (!char.IsA("Model")) return;

								effect.StatusAttributes.forEach((attribute) => {
									char.SetAttribute(attribute.lower(), undefined);
								});
							}

							effect.OnExpired(arg_0);
						}
					: undefined,
			});

			const UIDRegistry = this.AppliedEffectRegistry.get(UID) || {};
			UIDRegistry[effect.Name.lower()] = task;
			this.AppliedEffectRegistry.set(UID, UIDRegistry);

			if (effect.StatusAttributes) {
				const char = arg_0 as Model;
				if (!char.IsA("Model")) return;

				effect.StatusAttributes.forEach((attribute) => {
					char.SetAttribute(attribute.lower(), true);
				});
			}

			if (effect.Modifiers) {
				const char = arg_0 as Model;
				if (!char.IsA("Model")) return;

				const modifierConn = char.AttributeChanged.Connect((attribute) => {
					const modifier = effect.Modifiers!.get(attribute.lower());
					if (modifier) {
						const modifierStatus = this.StatusEffectRegistry.get(modifier.lower());
						if (modifierStatus && !char.GetAttribute(modifierStatus.Name.lower())) {
							this.RemoveStatusEffect(arg_0, UID, effect.Name);
							this.RemoveStatusEffect(arg_0, UID, attribute.lower());

							this.ApplyStatusEffect(char, UID, modifierStatus.Name);

							task.Destroy();
							modifierConn.Disconnect();
						}
					}
				});

				task.Signal.Once((state) => {
					if (state === TimerState.DESTROYED) {
						modifierConn.Disconnect();
					}
				});
			}

			task.Start();
		} else {
			error(`Could not find status effect "${effectName}"`);
		}
	}

	RemoveStatusEffect<T>(arg_0: T, UID: string, effectName: string) {
		const char = arg_0 as Model;
		if (!char.IsA("Model")) error("Must be provided a model");

		if (this.AppliedEffectRegistry.has(UID)) {
			const UIDRegistry = this.AppliedEffectRegistry.get(UID)!;
			if (UIDRegistry[effectName.lower()]) {
				UIDRegistry[effectName.lower()].Destroy();
				delete UIDRegistry[effectName.lower()];
				char.SetAttribute(effectName.lower(), undefined);
			} else print(`${effectName} not found in ${UID}'s effect registry`);
		} else error(`No status effects applied to player "${UID}"`);
	}
}

export default new StatusEffect();
