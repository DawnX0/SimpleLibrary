export async function SimpleRemoveSE<T>(arg_0: T, UID: string, effectName: string) {
	try {
		const SE = await import("../SimpleLibrary/StatusEffect");
		SE.default.RemoveStatusEffect(arg_0, UID, effectName);
	} catch (error) {
		warn("Failed to remove the status effect:", error);
	}
}
