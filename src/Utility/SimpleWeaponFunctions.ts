export async function SimpleEquip(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.Equip(model);
	} catch (error) {
		warn("Failed to equip the weapon:", error);
	}
}

export async function SimpleAssignWeapon(model: Model, weaponName: string) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.AssignWeapon(model, weaponName);
	} catch (error) {
		warn("Failed to assign the weapon:", error);
	}
}

export async function SimpleBasicATK(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.BasicATK(model);
	} catch (error) {
		warn("Failed to basic attack: ", error);
	}
}

export async function SimpleHeavyATK(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.HeavyATK(model);
	} catch (error) {
		warn("Failed to heavy attack: ", error);
	}
}

export async function SimpleBlock(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.Block(model);
	} catch (error) {
		warn("Failed to block: ", error);
	}
}
