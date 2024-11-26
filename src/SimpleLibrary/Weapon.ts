import { ReplicatedStorage, RunService } from "@rbxts/services";
import Remotes from "./Remotes";
import { ServerListenerEvent } from "@rbxts/net/out/server/ServerEvent";
import Object from "@rbxts/object-utils";
import { PlayAnimation } from "../Utility/Animation";

export type BaseWeapon = {
	Name: string;

	Idle: string;
	Walk: string;
	Jump: string;
	Holster: string;

	BasicATKConfig: {
		Animations: { [key: number]: string };
		HitReactions: { [key: number]: string };
		Priority?: Enum.AnimationPriority;
		Speed?: number;
		Fade?: number;

		Restrictions?: string[];
		AdditionalAttributes?: string[];
		Markers?: Map<string, (model: Model) => void>;
	};

	HeavyATKConfig: {
		Animation: string;
		HitReaction?: string;
		Priority?: Enum.AnimationPriority;
		Speed?: number;
		Fade?: number;

		Restrictions?: string[];
		AdditionalAttributes?: string[];
		Markers?: Map<string, (model: Model) => void>;
	};
};

const FOLDER_NAME = "Weapons";
const ANIMATE_NAME = "Animate";
const DEFAULT_IDS = {
	Idle: "http://www.roblox.com/asset/?id=180435571",
	Walk: "http://www.roblox.com/asset/?id=180426354",
	Jump: "http://www.roblox.com/asset/?id=180435571",
};
export const WEAPON_ATTRIBUTE = "Weapon";
export const EQUIPPED_ATTRIBUTE = "Equipped";

class Weapon {
	WeaponRegistry: Map<string, BaseWeapon> = new Map();
	MarkerLink: ServerListenerEvent<[string]> = Remotes.Server.Get("MarkerLink");
	WeaponLink = Remotes.Server.Get("WeaponLink");

	constructor() {
		this.RegisterWeapons();
	}

	RegisterWeapons() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as BaseWeapon;

					try {
						if (this.WeaponRegistry.get(reqChild.Name.lower())) {
							error(`"${reqChild.Name}" already exists.`);
						}
						this.WeaponRegistry.set(reqChild.Name.lower(), reqChild);
					} catch (e) {
						warn(`code execution stopped: ${child.Name} is an empty file found in ${FOLDER_NAME}`);
						return;
					}
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	AssignWeapon(model: Model, weaponName: string) {
		const weapon = this.WeaponRegistry.get(weaponName.lower());

		if (!weapon) {
			error(`Weapon "${weaponName}" not found.`);
		}

		model.SetAttribute(WEAPON_ATTRIBUTE, weapon.Name.lower());
		model.SetAttribute(EQUIPPED_ATTRIBUTE, false);
	}

	UnassignWeapon(model: Model) {
		model.SetAttribute(WEAPON_ATTRIBUTE, undefined);
	}

	Equip(model: Model) {
		const assignedWeapon = model.GetAttribute(WEAPON_ATTRIBUTE) as string | undefined;
		if (!assignedWeapon) error("Weapon not assigned to: " + model.Name);

		const weapon = this.WeaponRegistry.get(assignedWeapon);
		if (!weapon) error("Weapon not found in registry: " + assignedWeapon);

		const humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!humanoid) error("Humanoid not found in: " + model.Name);

		const animate = model.FindFirstChild(ANIMATE_NAME, true);
		if (!animate) error("Animate script not found in: " + model.Name);

		const switchAnimations = (weapon?: BaseWeapon) => {
			if (weapon) {
				for (const [animType, animId] of Object.entries({
					Idle: weapon.Idle,
					Walk: weapon.Walk,
					Jump: weapon.Jump,
				})) {
					const action = animate.FindFirstChild(animType.lower()) as ObjectValue;
					const animation = action?.FindFirstChildWhichIsA("Animation");
					if (animation) animation.AnimationId = animId || animation.AnimationId;
				}
			} else {
				for (const [animType, animId] of Object.entries({
					Idle: DEFAULT_IDS.Idle,
					Walk: DEFAULT_IDS.Walk,
					Jump: DEFAULT_IDS.Jump,
				})) {
					const action = animate.FindFirstChild(animType.lower()) as ObjectValue;
					const animation = action?.FindFirstChildWhichIsA("Animation");
					if (animation) animation.AnimationId = animId || animation.AnimationId;
				}
			}
		};

		const weaponEquipped = model.GetAttribute(EQUIPPED_ATTRIBUTE) as boolean;
		if (!weaponEquipped) {
			model.SetAttribute(EQUIPPED_ATTRIBUTE, true);
			PlayAnimation(model, weapon.Holster, "holster");

			switchAnimations(weapon);

			humanoid.ChangeState(Enum.HumanoidStateType.None);
			humanoid.ChangeState(Enum.HumanoidStateType.Running);
		} else if (weaponEquipped) {
			model.SetAttribute(EQUIPPED_ATTRIBUTE, false);
			PlayAnimation(model, weapon.Holster, "holster", undefined, -1);

			switchAnimations();

			humanoid.ChangeState(Enum.HumanoidStateType.None);
			humanoid.ChangeState(Enum.HumanoidStateType.Running);
		}
	}

	BasicATK(model: Model) {}

	HeavyATK(model: Model) {}
}

export default new Weapon();
