export async function SimpleAttack(model: Model) {
	try {
		const Weapon = await import("../SimpleLibrary/Weapon");
		Weapon.default.Attack(model);
	} catch (error) {
		warn("Failed to apply the status effect:", error);
	}
}
