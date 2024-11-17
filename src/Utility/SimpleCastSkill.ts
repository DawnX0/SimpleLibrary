export async function SimpleCastSkill(model: Model, skillName: string) {
	try {
		const Skill = await import("../SimpleLibrary/Skill");
		Skill.default.Cast(model, skillName);
	} catch (error) {
		warn("Failed to load the skill:", error);
	}
}
