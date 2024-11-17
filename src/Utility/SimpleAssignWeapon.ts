export async function SimpleAssignWeapon(model: Model, weaponName: string, bounded?: boolean) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.AssignWeapon(model, weaponName, bounded);
	} catch (error) {
		warn("Failed to assign the weapon:", error);
	}
}
