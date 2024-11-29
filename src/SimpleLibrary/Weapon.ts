import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import Remotes from "./Remotes";
import { ServerListenerEvent } from "@rbxts/net/out/server/ServerEvent";
import Object from "@rbxts/object-utils";
import { PlayAnimation, PlaySound, StopAllAnimations, StopAnimation } from "../Utility/SimpleMiscFunctions";
import { CheckAttributes } from "../Utility/SimpleMiscFunctions";

export type BaseWeapon = {
	Name: string;
	EquipCooldown: number;

	Idle: string;
	Walk: string;
	Jump: string;
	Holster?: string;
	Unholster?: string;

	BasicATKConfig: {
		Animations: { [key: number]: string };
		HitReactions: { [key: number]: string };
		Priority?: Enum.AnimationPriority;
		Speed?: number;
		Fade?: number;

		SwingSFX?: string;
		SwingLoudness?: number;

		HitSFX?: string;

		Damage: number;
		Cooldown: number;
		ComboReset: number;
		Endlag: number;
		Slow: number;
		HitSize: Vector3;
		Range: number;
		KnockbackForce: number;
		KnockbackDuration: number;

		Restrictions?: string[];
		AdditionalAttributes?: Record<string, number>;
	};

	HeavyATKConfig: {
		Animation: string;
		HitReaction?: string;
		Priority?: Enum.AnimationPriority;
		Speed?: number;
		Fade?: number;

		SwingSFX?: string;
		SwingLoudness?: number;

		HitSFX?: string;

		Damage: number;
		Cooldown: number;
		Endlag: number;
		Slow: number;
		HitSize: Vector3;
		Range: number;
		KnockbackForce: number;
		KnockbackDuration: number;

		Restrictions?: string[];
		AdditionalAttributes?: Record<string, number>;
	};

	BlockConfig?: {
		Animation: string;
		WalkSpeed: number;
		HitReaction?: string;
		Priority?: Enum.AnimationPriority;
		Speed?: number;
		Fade?: number;
		Restrictions?: string[];
	};

	ModelConfig?: {
		Models: Map<
			Model,
			{
				HolsteredPart: MODEL_POSIIIONS;
				Holstered: CFrame;
				HolsterWaitTime?: number;

				Unholstered: CFrame;
				UnholsteredPart: MODEL_POSIIIONS;
				UnholsterWaitTime?: number;
			}
		>;
		Fade?: number;
	};

	Markers?: Map<string, (model: Model) => void>;
};

export type WEAPONLINK_MESSAGE = "Basic" | "Heavy" | "Block";
export type MODEL_POSIIIONS = "Left Arm" | "Right Arm" | "HumanoidRootPart";

const FOLDER_NAME = "Weapons";
const ANIMATE_NAME = "Animate";
const DEFAULT_IDS = {
	Idle: "http://www.roblox.com/asset/?id=180435571",
	Walk: "http://www.roblox.com/asset/?id=180426354",
	Jump: "http://www.roblox.com/asset/?id=180435571",
};
export const WEAPON_ATTRIBUTE = "Weapon";
export const EQUIPPED_ATTRIBUTE = "Equipped";
export const COMBO_ATTRIBUTE = "Combo";
export const COMBOCD_ATTRIBUTE = "ComboCooldown";
export const HEAVYCD_ATTRIBUTE = "HeavyCooldown";
export const ATTACKING_ATTRIBUTE = "Attacking";
export const BLOCKING_ATTRIBUTE = "Blocking";
export const EQUIPCD_ATTRIBUTE = "EquipCooldown";

class Weapon {
	WeaponRegistry: Map<string, BaseWeapon> = new Map();
	MarkerLink: ServerListenerEvent<[string]> | undefined = RunService.IsServer()
		? Remotes.Server.Get("MarkerLink")
		: undefined;

	constructor() {
		this.RegisterWeapons();

		if (RunService.IsServer()) {
			this.MarkerLink!.Connect((player: Player, markerName: string) => {
				const weaponName = player.Character?.GetAttribute(WEAPON_ATTRIBUTE) as string | undefined;
				if (weaponName && player.Character) {
					const weapon = this.WeaponRegistry.get(weaponName);
					if (weapon) {
						if (weapon.Markers) {
							const callback = weapon.Markers.get(markerName);
							if (callback) {
								callback(player.Character);
							}
						}
					} else error("Weapon not found: " + weaponName);
				} else error("No weapon assigned to character");
			});
		} else if (RunService.IsClient()) {
			Remotes.Client.Get("WeaponLink").Connect((model, animationId, message) => {
				const weapon = this.WeaponRegistry.get(model.GetAttribute(WEAPON_ATTRIBUTE) as string);
				if (!weapon) error("Weapon not found");

				if (message === "Basic") {
					const priority = weapon.BasicATKConfig.Priority;
					const speed = weapon.BasicATKConfig.Speed;
					const markers = weapon.Markers;

					PlayAnimation(model, animationId, "basicATK", priority, speed, markers);
				} else if (message === "Heavy") {
					const priority = weapon.HeavyATKConfig.Priority;
					const speed = weapon.HeavyATKConfig.Speed;
					const markers = weapon.Markers;

					PlayAnimation(model, animationId, "heavyATK", priority, speed, markers);
				} else if (message === "Block" && weapon.BlockConfig) {
					const priority = weapon.BlockConfig.Priority;
					const speed = weapon.BlockConfig.Speed;
					const markers = weapon.Markers;

					PlayAnimation(model, animationId, "block", priority, speed, markers);
				}
			});
		}
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

		const rootpart = model.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
		if (!rootpart) error("No root part found");

		const humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!humanoid) error("No humanoid in: " + model.Name);

		if (weapon.ModelConfig) {
			for (const [
				foundModel,
				{ HolsteredPart, Holstered, HolsterWaitTime, Unholstered, UnholsteredPart, UnholsterWaitTime },
			] of weapon.ModelConfig.Models) {
				const newModel = foundModel.Clone();
				newModel.Parent = model;

				const handle = newModel.PrimaryPart;
				if (!handle) error("Model doesn't have a primary part: " + newModel.Name);

				const holsteredPart = model.FindFirstChild(HolsteredPart) as BasePart;
				if (!holsteredPart) error("Model doesn't have the specified part: " + HolsteredPart);

				const unholsteredPart = model.FindFirstChild(UnholsteredPart) as BasePart;
				if (!unholsteredPart) error("Model doesn't have the specified part: " + UnholsteredPart);

				const motor6D = new Instance("Motor6D");
				motor6D.Part0 = holsteredPart;
				motor6D.Part1 = handle;
				motor6D.C1 = Holstered;
				motor6D.Parent = handle;

				const equipConn = model.GetAttributeChangedSignal(EQUIPPED_ATTRIBUTE).Connect(() => {
					if (model.GetAttribute(EQUIPPED_ATTRIBUTE)) {
						if (UnholsterWaitTime) task.wait(UnholsterWaitTime);
						motor6D.Part0 = unholsteredPart;
						motor6D.C1 = Unholstered;
					} else {
						if (HolsterWaitTime) task.wait(HolsterWaitTime);
						motor6D.Part0 = holsteredPart;
						motor6D.C1 = Holstered;
					}
				});

				humanoid.Died.Once(() => equipConn.Disconnect());
			}
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

		if (CheckAttributes(model, [ATTACKING_ATTRIBUTE, BLOCKING_ATTRIBUTE, EQUIPCD_ATTRIBUTE])) return;

		model.SetAttribute(EQUIPCD_ATTRIBUTE, true);
		task.delay(weapon.EquipCooldown, () => model.SetAttribute(EQUIPCD_ATTRIBUTE, undefined));

		const humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!humanoid) error("Humanoid not found in: " + model.Name);

		const animate = model.FindFirstChild(ANIMATE_NAME, true);
		if (!animate) error("Animate script not found in: " + model.Name);

		let idled: boolean;

		const weaponEquipped = model.GetAttribute(EQUIPPED_ATTRIBUTE) as boolean;
		StopAllAnimations(model);
		if (!weaponEquipped) {
			if (weapon.Holster) {
				PlayAnimation(model, weapon.Holster, "holster", Enum.AnimationPriority.Action);
			}
			model.SetAttribute(EQUIPPED_ATTRIBUTE, true);

			for (const [animType, animId] of Object.entries({
				Idle: weapon.Idle,
				Walk: weapon.Walk,
				Jump: weapon.Jump,
			})) {
				const action = animate.FindFirstChild(animType.lower()) as ObjectValue;
				const animation = action?.FindFirstChildWhichIsA("Animation");
				if (animation) animation.AnimationId = animId || animation.AnimationId;
			}

			if (humanoid.MoveDirection.Magnitude > 0) {
				PlayAnimation(model, weapon.Walk, "walk", Enum.AnimationPriority.Movement);
				idled = false;
			} else if (humanoid.MoveDirection.Magnitude <= 0) {
				PlayAnimation(model, weapon.Idle, "idle", Enum.AnimationPriority.Movement);
				idled = true;
			}
		} else if (weaponEquipped) {
			if (weapon.Unholster) {
				PlayAnimation(model, weapon.Unholster, "unholster", Enum.AnimationPriority.Action);
			}
			model.SetAttribute(EQUIPPED_ATTRIBUTE, false);

			for (const [animType, animId] of Object.entries({
				Idle: DEFAULT_IDS.Idle,
				Walk: DEFAULT_IDS.Walk,
				Jump: DEFAULT_IDS.Jump,
			})) {
				const action = animate.FindFirstChild(animType.lower()) as ObjectValue;
				const animation = action?.FindFirstChildWhichIsA("Animation");
				if (animation) animation.AnimationId = animId || animation.AnimationId;
			}

			if (humanoid.MoveDirection.Magnitude > 0) {
				PlayAnimation(model, DEFAULT_IDS.Walk, "walk", Enum.AnimationPriority.Movement);
				idled = false;
			} else if (humanoid.MoveDirection.Magnitude <= 0) {
				PlayAnimation(model, DEFAULT_IDS.Idle, "idle", Enum.AnimationPriority.Movement);
				idled = true;
			}
		}

		const jumpConn = humanoid.GetPropertyChangedSignal("Jump").Connect(() => {
			StopAnimation(model, "idle");
			StopAnimation(model, "walk");
		});

		const moveConn = humanoid.GetPropertyChangedSignal("MoveDirection").Connect(() => {
			if (humanoid.MoveDirection.Magnitude > 0 && idled) {
				StopAnimation(model, "idle");
				moveConn.Disconnect();
				jumpConn.Disconnect();
			} else if (humanoid.MoveDirection.Magnitude <= 0 && !idled) {
				StopAnimation(model, "walk");
				moveConn.Disconnect();
				jumpConn.Disconnect();
			}
		});

		const equipConn = model.GetAttributeChangedSignal(EQUIPPED_ATTRIBUTE).Connect(() => {
			equipConn.Disconnect();
			jumpConn.Disconnect();
			moveConn.Disconnect();
		});

		humanoid.Died.Once(() => {
			jumpConn.Disconnect();
			moveConn.Disconnect();
			equipConn.Disconnect();
		});
	}

	BasicATK(model: Model) {
		if (!RunService.IsServer()) return;

		const assignedWeapon = model.GetAttribute(WEAPON_ATTRIBUTE) as string | undefined;
		if (!assignedWeapon) error("Weapon not assigned to: " + model.Name);

		const weapon = this.WeaponRegistry.get(assignedWeapon);
		if (!weapon) error("Weapon not found in registry: " + assignedWeapon);

		const equipped = model.GetAttribute(EQUIPPED_ATTRIBUTE);
		if (!equipped) return;

		const restricitons = weapon.BasicATKConfig.Restrictions
			? (() => {
					const result: string[] = weapon.BasicATKConfig.Restrictions!;
					result.push(ATTACKING_ATTRIBUTE, COMBOCD_ATTRIBUTE, BLOCKING_ATTRIBUTE);
					return result;
				})()
			: [ATTACKING_ATTRIBUTE, COMBOCD_ATTRIBUTE, BLOCKING_ATTRIBUTE];

		if (CheckAttributes(model, restricitons)) return;

		const humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!humanoid) error("Humanoid not found in: " + model.Name);

		humanoid.WalkSpeed = weapon.BasicATKConfig.Slow;

		// Basic Attack
		if (weapon.BasicATKConfig.AdditionalAttributes) {
			Object.entries(weapon.BasicATKConfig.AdditionalAttributes).forEach(([attribute, duration]) => {
				model.SetAttribute(attribute, true);
				const additionalTask = task.delay(duration, () => {
					model.SetAttribute(attribute, undefined);
				});

				model.GetAttributeChangedSignal(attribute).Once(() => {
					task.cancel(additionalTask);
				});
			});
		}

		model.SetAttribute(ATTACKING_ATTRIBUTE, true);

		// Combo
		const maxCombo = Object.keys(weapon.BasicATKConfig.Animations).size();
		const currentCombo = (model.GetAttribute(COMBO_ATTRIBUTE) as number) || 1;

		const player = Players.GetPlayerFromCharacter(model);
		if (player) {
			Remotes.Server.Get("WeaponLink").SendToPlayer(
				player,
				model,
				weapon.BasicATKConfig.Animations[currentCombo],
				"Basic",
			);
		} else {
			// Assume NPC
		}

		if (weapon.BasicATKConfig.SwingSFX) {
			PlaySound(weapon.BasicATKConfig.SwingSFX, {
				parent: model,
				name: "swing",
				loudness: weapon.BasicATKConfig.SwingLoudness,
			});
		}

		if (currentCombo < maxCombo) {
			model.SetAttribute(COMBO_ATTRIBUTE, currentCombo + 1);
		} else {
			model.SetAttribute(COMBOCD_ATTRIBUTE, true);
			model.SetAttribute(COMBO_ATTRIBUTE, 1);
			task.delay(weapon.BasicATKConfig.Cooldown, () => {
				model.SetAttribute(COMBOCD_ATTRIBUTE, undefined);
			});
		}

		const comboTask = task.delay(weapon.BasicATKConfig.ComboReset, () => {
			model.SetAttribute(COMBO_ATTRIBUTE, undefined);
		});

		model.GetAttributeChangedSignal(COMBO_ATTRIBUTE).Once(() => {
			task.cancel(comboTask);
		});

		const attackingTask = task.delay(weapon.BasicATKConfig.Endlag, () => {
			model.SetAttribute(ATTACKING_ATTRIBUTE, undefined);
			humanoid.WalkSpeed = 16;
		});

		model.GetAttributeChangedSignal(ATTACKING_ATTRIBUTE).Once(() => {
			task.cancel(attackingTask);
		});
	}

	HeavyATK(model: Model) {
		if (!RunService.IsServer()) return;

		const assignedWeapon = model.GetAttribute(WEAPON_ATTRIBUTE) as string | undefined;
		if (!assignedWeapon) error("Weapon not assigned to: " + model.Name);

		const weapon = this.WeaponRegistry.get(assignedWeapon);
		if (!weapon) error("Weapon not found in registry: " + assignedWeapon);

		const equipped = model.GetAttribute(EQUIPPED_ATTRIBUTE);
		if (!equipped) return;

		const restricitons = weapon.HeavyATKConfig.Restrictions
			? (() => {
					const result: string[] = weapon.HeavyATKConfig.Restrictions!;
					result.push(ATTACKING_ATTRIBUTE, HEAVYCD_ATTRIBUTE, BLOCKING_ATTRIBUTE);
					return result;
				})()
			: [ATTACKING_ATTRIBUTE, HEAVYCD_ATTRIBUTE, BLOCKING_ATTRIBUTE];

		if (CheckAttributes(model, restricitons)) return;

		const humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!humanoid) error("Humanoid not found in: " + model.Name);

		humanoid.WalkSpeed = weapon.HeavyATKConfig.Slow;

		if (weapon.HeavyATKConfig.AdditionalAttributes) {
			Object.entries(weapon.HeavyATKConfig.AdditionalAttributes).forEach(([attribute, duration]) => {
				model.SetAttribute(attribute, true);
				const additionalTask = task.delay(duration, () => {
					model.SetAttribute(attribute, undefined);
				});

				model.GetAttributeChangedSignal(attribute).Once(() => {
					task.cancel(additionalTask);
				});
			});
		}

		model.SetAttribute(ATTACKING_ATTRIBUTE, true);
		model.SetAttribute(HEAVYCD_ATTRIBUTE, true);

		const player = Players.GetPlayerFromCharacter(model);
		if (player) {
			Remotes.Server.Get("WeaponLink").SendToPlayer(player, model, weapon.HeavyATKConfig.Animation, "Heavy");
		} else {
			// Assume NPC
		}

		if (weapon.HeavyATKConfig.SwingSFX) {
			PlaySound(weapon.HeavyATKConfig.SwingSFX, {
				parent: model,
				name: "swing",
				loudness: weapon.BasicATKConfig.SwingLoudness,
			});
		}

		const attackingTask = task.delay(weapon.HeavyATKConfig.Endlag, () => {
			model.SetAttribute(ATTACKING_ATTRIBUTE, undefined);
			humanoid.WalkSpeed = 16;
		});

		model.GetAttributeChangedSignal(ATTACKING_ATTRIBUTE).Once(() => {
			task.cancel(attackingTask);
		});

		task.delay(weapon.HeavyATKConfig.Cooldown, () => {
			model.SetAttribute(HEAVYCD_ATTRIBUTE, undefined);
		});
	}

	Block(model: Model) {
		const assignedWeapon = model.GetAttribute(WEAPON_ATTRIBUTE) as string | undefined;
		if (!assignedWeapon) error("Weapon not assigned to: " + model.Name);

		const weapon = this.WeaponRegistry.get(assignedWeapon);
		if (!weapon || !weapon.BlockConfig) error("Weapon not found in registry: " + assignedWeapon);

		const equipped = model.GetAttribute(EQUIPPED_ATTRIBUTE);
		if (!equipped) return;

		const Humanoid = model.FindFirstChildWhichIsA("Humanoid");
		if (!Humanoid) error("Couldn't find humanoid");

		const restricitons = weapon.BlockConfig.Restrictions
			? (() => {
					const result: string[] = weapon.BlockConfig.Restrictions!;
					result.push(ATTACKING_ATTRIBUTE);
					return result;
				})()
			: [ATTACKING_ATTRIBUTE];

		if (CheckAttributes(model, restricitons)) return;

		if (model.GetAttribute(BLOCKING_ATTRIBUTE)) {
			if (RunService.IsClient()) {
				StopAnimation(model, "block");
			} else {
				model.SetAttribute(BLOCKING_ATTRIBUTE, undefined);
				Humanoid.WalkSpeed = 16;
			}
		} else {
			if (RunService.IsClient()) {
				PlayAnimation(
					model,
					weapon.BlockConfig.Animation,
					"block",
					weapon.BlockConfig.Priority,
					weapon.BlockConfig.Speed,
					weapon.Markers,
				);
			} else {
				model.SetAttribute(BLOCKING_ATTRIBUTE, true);
				Humanoid.WalkSpeed = weapon.BlockConfig.WalkSpeed;
			}
		}
	}
}

export default new Weapon();
