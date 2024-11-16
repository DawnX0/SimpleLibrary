import { ReplicatedStorage } from "@rbxts/services";

export type BaseWeapon = {
	Name: string;
	WeaponType: "Melee" | "Ranged";

	Idle?: string;
	Walk?: string;
	Jump?: string;
};

interface MeleeWeaponType extends BaseWeapon {
	RegularAttack: {
		Damage: number;
	};

	HeavyAttack: {
		Damage: number;
	};
}

interface RangedWeaponType extends BaseWeapon {
	ProjectileSettings: {
		Model: Model;
		Speed: number;
		Falloff: number;
		ProjectileLifetime: number;
	};
}

const FOLDER_NAME = "Weapons";

class Weapon {
	WeaponRegistry: Map<string, BaseWeapon> = new Map();

	constructor() {
		this.RegisterWeapons();
	}

	RegisterWeapons() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as MeleeWeaponType | RangedWeaponType;

					if (this.WeaponRegistry.has(reqChild.Name.lower())) {
						error(`Action with name "${reqChild.Name}" already exists.`);
					}
					this.WeaponRegistry.set(reqChild.Name.lower(), reqChild);
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	Attack() {}

	HeavyAttack() {}

	ShootProjectile() {}

	Reload() {}
}

export default new Weapon();
