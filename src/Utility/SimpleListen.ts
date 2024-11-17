export async function SimpleListen(player?: Player) {
	try {
		const Action = await import("../SimpleLibrary/Action");
		Action.default.Listen(player);
	} catch (error) {
		warn("Failed to listen:", error);
	}
}
