export async function SimpleApplySE(model: Model, UID: string, effectName: string) {
	try {
		const SE = await import("../SimpleLibrary/StatusEffect");
		SE.default.ApplyStatusEffect(model, UID, effectName);
	} catch (error) {
		warn("Failed to apply the status effect:", error);
	}
}
