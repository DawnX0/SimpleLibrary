import Object from "@rbxts/object-utils";
import { Players, ReplicatedStorage, RunService } from "@rbxts/services";
import { GetAnimator } from "../Utility/GetAnimator";
import { PlayAnimation } from "../Utility/Animation";
import { CheckAttributes } from "../Utility/CheckAttributes";
import Remotes from "./Remotes";
import { ServerListenerEvent } from "@rbxts/net/out/server/ServerEvent";
import { SimpleKnockback } from "../Utility/SimpleKnockback";

type BaseWeapon = {
	Name: string;
	WeaponType: "Melee" | "Ranged";

	Markers?: Map<string, (model: Model) => void>;

	Idle?: string;
	Walk?: string;
	Jump?: string;

	AttackSettings: {
		AdditionalAttributes?: Map<string, number>;
		Restrictions?: string[];

		ComboAnimations: { [key: number]: string };
		HitReaction?: { [key: number]: string };
		AnimationPriority?: Enum.AnimationPriority;
		AnimationSpeed?: number;

		KnockbackForce?: number;
		KnockbackDuration?: number;
		HitSize: Vector3;
		Range: number;
		Damage: number;
		ComboReset: number;
		Endlag: number;
		Cooldown: number;
		SlowSpeed?: number;
	};

	HeavyAttackSettings: {
		AdditionalAttributes?: Map<string, number>;
		Restrictions?: string[];

		Animation: string;
		HitReaction?: string;

		KnockbackForce?: number;
		KnockbackDuration?: number;
		HitSize: Vector3;
		Range: number;
		Damage: number;
		Endlag: number;
		Cooldown: number;
		Slow?: number;
	};

	ModelSettings?: {
		Model: Model;
		HolsterPosition: "back" | "lefthip" | "righthip";
	};
};

export type MeleeWeaponType = {} & BaseWeapon;

export type RangedWeaponType = {
	ReloadSettings: {
		Animation: string;

		Magazine: number;
		MagazineSize: number;
	};

	ProjectileSettings: {
		Model: Model;
		Speed: number;
		Lifetime: number;
		Falloff: number;
		HitSize: Vector3;
		Damage?: number;
	};
} & BaseWeapon;

const FOLDER_NAME = "Weapons";
const ANIMATE_NAME = "Animate";
export const WEAPON_ATTRIBUTE = "Weapon";
export const COMBO_ATTRIBUTE = "Combo";
export const COOLDOWN_ATTRIBUTE = "WeaponCooldown";
export const ATTACKING_ATTRIBUTE = "Attacking";
const ATTACK_ANIMATION_NAME = "attack";
const SYNCHRONIZAITON_RATE = 0.05;

export const HitboxPresets = {
	normal: {
		hitbox: (model: Model) => {},
	},
	advanced: {
		hitbox: (model: Model) => {},
	},
};

class Weapon {
	WeaponRegistry: Map<string, MeleeWeaponType | RangedWeaponType> = new Map();
	markerLink: ServerListenerEvent<[string]> | undefined = RunService.IsServer()
		? Remotes.Server.Get("MarkerLink")
		: undefined;

	constructor() {
		this.RegisterWeapons();

		if (RunService.IsServer()) {
			this.markerLink!.Connect((player: Player, markerName: string) => {
				const weaponName = player.Character?.GetAttribute(WEAPON_ATTRIBUTE.lower()) as string | undefined;
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
			Remotes.Client.Get("KnockbackLink").Connect((model, force, direction, duration) => {
				SimpleKnockback(model, force, direction, duration);
			});

			Remotes.Client.Get("WeaponLink").Connect((model, combo) => {
				const weaponName = model.GetAttribute(WEAPON_ATTRIBUTE.lower()) as string;
				const weapon = this.WeaponRegistry.get(weaponName);
				const animationId = weapon?.AttackSettings.ComboAnimations[combo];
				if (!animationId) error("Couldn't find animation");

				PlayAnimation(
					model,
					animationId,
					ATTACK_ANIMATION_NAME,
					weapon?.AttackSettings.AnimationPriority,
					weapon?.AttackSettings.AnimationSpeed,
					weapon?.Markers,
				);
			});
		}
	}

	RegisterWeapons() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as MeleeWeaponType | RangedWeaponType;

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

	AssignWeapon(model: Model, weaponName: string, bounded?: boolean) {
		const weapon = this.WeaponRegistry.get(weaponName.lower()) as MeleeWeaponType | RangedWeaponType;
		if (!weapon) {
			error(`Weapon "${weaponName}" not found.`);
		}

		const handleAnimationChange = () => {
			const animator = GetAnimator(model);
			const animate = model.FindFirstChild(ANIMATE_NAME) as LocalScript;
			if (animator && animate) {
				for (const [animType, animId] of Object.entries({
					Idle: weapon.Idle,
					Walk: weapon.Walk,
					Jump: weapon.Jump,
				})) {
					const action = animate.FindFirstChild(animType.lower()) as ObjectValue;
					const animation = action?.FindFirstChildWhichIsA("Animation");
					if (animation) animation.AnimationId = animId || animation.AnimationId;
				}
			}
		};

		handleAnimationChange();
		model.SetAttribute(WEAPON_ATTRIBUTE.lower(), weapon.Name.lower());
		model.SetAttribute(COMBO_ATTRIBUTE.lower(), 1);

		if (bounded) {
			const humanoid = model.FindFirstChildWhichIsA("Humanoid");
			humanoid!.Died.Once(() => {
				handleAnimationChange();
			});
		}
	}

	Attack(model: Model) {
		const currentWeapon = model.GetAttribute(WEAPON_ATTRIBUTE.lower()) as string | undefined;
		if (!currentWeapon) return;

		const weapon = this.WeaponRegistry.get(currentWeapon.lower());
		if (weapon) {
			const Restrictions: string[] = weapon.AttackSettings.Restrictions
				? (() => {
						const result: string[] = weapon.AttackSettings.Restrictions!;
						result.push(ATTACKING_ATTRIBUTE, COOLDOWN_ATTRIBUTE);
						return result;
					})()
				: [ATTACKING_ATTRIBUTE, COOLDOWN_ATTRIBUTE];

			if (weapon.WeaponType === "Melee") {
				if (RunService.IsServer()) {
					if (CheckAttributes(model, Restrictions)) {
						return;
					}

					const player = Players.GetPlayerFromCharacter(model);
					if (player) {
						Remotes.Server.Get("WeaponLink").SendToPlayer(
							player,
							model,
							model.GetAttribute(COMBO_ATTRIBUTE.lower()) as number,
						);
					}

					task.wait(SYNCHRONIZAITON_RATE);

					const setAttributeWithTimeout = (attribute: string, duration: number) => {
						model.SetAttribute(attribute.lower(), true);
						const timeoutTask = task.delay(duration, () => model.SetAttribute(attribute, undefined));
						model.GetAttributeChangedSignal(attribute).Once(() => task.cancel(timeoutTask));
					};

					const humanoid = model.FindFirstChildWhichIsA("Humanoid");
					if (!humanoid) error("No humanoid found in" + model.Name);

					if (weapon.AttackSettings.SlowSpeed) {
						humanoid.WalkSpeed = weapon.AttackSettings.SlowSpeed;
					}

					model.SetAttribute(ATTACKING_ATTRIBUTE.lower(), true);
					const timeoutTask = task.delay(weapon.AttackSettings.Endlag, () => {
						model.SetAttribute(ATTACKING_ATTRIBUTE.lower(), undefined);
						humanoid.WalkSpeed = 16;
					});
					model.GetAttributeChangedSignal(ATTACKING_ATTRIBUTE.lower()).Once(() => task.cancel(timeoutTask));

					if (weapon.AttackSettings.AdditionalAttributes) {
						weapon.AttackSettings.AdditionalAttributes.forEach((duration, attribute) => {
							setAttributeWithTimeout(attribute.lower(), duration);
						});
					}

					const currentCombo = (model.GetAttribute(COMBO_ATTRIBUTE.lower()) as number) || 0;
					const comboAnimationsCount = Object.keys(weapon.AttackSettings.ComboAnimations).size();

					if (currentCombo < comboAnimationsCount) {
						model.SetAttribute(COMBO_ATTRIBUTE.lower(), currentCombo + 1);
					} else {
						model.SetAttribute(COMBO_ATTRIBUTE.lower(), 1);

						setAttributeWithTimeout(COOLDOWN_ATTRIBUTE.lower(), weapon.AttackSettings.Cooldown);
					}

					const resetComboTask = task.delay(weapon.AttackSettings.ComboReset, () => {
						model.SetAttribute(COMBO_ATTRIBUTE.lower(), 1);
					});

					model.GetAttributeChangedSignal(COMBO_ATTRIBUTE.lower()).Once(() => task.cancel(resetComboTask));
				}
			} else if (weapon.WeaponType === "Ranged") {
				if (RunService.IsClient()) {
					print("Client: Attack");
				} else if (RunService.IsServer()) {
					print("Server: Attack");
				}
			}
		}
	}
}

export default new Weapon();
