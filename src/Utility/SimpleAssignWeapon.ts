export async function SimpleAssignWeapon(model: Model, weaponName: string) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.AssignWeapon(model, weaponName);
	} catch (error) {
		warn("Failed to assign the weapon:", error);
	}
}
