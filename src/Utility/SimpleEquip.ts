export async function SimpleEquip(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.Equip(model);
	} catch (error) {
		warn("Failed to equip the weapon:", error);
	}
}
