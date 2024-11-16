import { ReplicatedStorage } from "@rbxts/services";
import Timer, { TimerType } from "./Timer";

export type StatusEffectType = {
	Name: string;
	Duration: number;
	Tick: number;
	Stacks?: boolean;
	MaxStacks?: number;
	StatusAttributes?: string[];
	Modifiers?: Map<string, string>;

    OnExpired: <T>(arg: T) => void;
    OnTick: <T>(arg: T) => void;
};

const FOLDER_NAME = "StatusEffects";

class StatusEffect {
	StatusEffectRegistry: Map<string, StatusEffectType> = new Map();
    AppliedEffectRegistry: Map<string, { [key: string ]: TimerType}> = new Map();

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

					if (this.StatusEffectRegistry.has(reqChild.Name.lower())) {
						error(`Action with name "${reqChild.Name}" already exists.`);
					}
					this.StatusEffectRegistry.set(reqChild.Name.lower(), reqChild);
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
                OnTick: effect.OnTick,
                OnExpired: effect.OnExpired,
            })

            const UIDRegistry = this.AppliedEffectRegistry.get(UID) || {};
            UIDRegistry[UID] = task;
            this.AppliedEffectRegistry.set(UID, UIDRegistry);

            task.Start();

        } else error(`Could not find status effect "${effectName}"`);
    }

    RemoveStatusEffect(UID: string, effectName: string) {
        if (this.AppliedEffectRegistry.has(UID)) {
            const UIDRegistry = this.AppliedEffectRegistry.get(UID)!;
            if (UIDRegistry[effectName]) {
                UIDRegistry[effectName].Destroy();
                delete UIDRegistry[effectName];
            }
        } else error(`No status effects applied to player "${UID}"`);
    }
}

export default new StatusEffect();
