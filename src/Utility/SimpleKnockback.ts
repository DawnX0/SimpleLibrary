import { Players, RunService } from "@rbxts/services";
import Remotes from "../SimpleLibrary/Remotes";

const REPLICATION_RANGE = 30;

export function SimpleKnockback(model: Model, direction: Vector3, force: number, duration: number) {
	const rootpart = model.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
	if (!rootpart) error("No root part found");

	if (RunService.IsServer()) {
		const exemptPlayers: Player[] = [];

		// Loop through all players and check their distance from the target model
		Players.GetPlayers().forEach((playerInList: Player) => {
			const playerChar = playerInList.Character;
			if (playerChar && playerChar.PrimaryPart) {
				// Calculate the distance from the player's PrimaryPart to the target model's PrimaryPart
				const distance = playerChar.PrimaryPart.Position.sub(rootpart.Position).Magnitude;

				// If the distance is greater than the replication range, add to exemptPlayers
				if (distance > REPLICATION_RANGE) {
					exemptPlayers.push(playerInList);
				}
			}
		});

		Remotes.Server.Get("KnockbackLink").SendToAllPlayersExcept(exemptPlayers, model, direction, force, duration);
	} else if (RunService.IsClient()) {
		const startTime = tick();

		// Knockback effect
		const connection = game.GetService("RunService").RenderStepped.Connect((deltaTime) => {
			const elapsedTime = tick() - startTime;

			if (elapsedTime >= duration) {
				connection.Disconnect();
				return;
			}

			rootpart.AssemblyLinearVelocity = direction.mul(force);
		});
	}
}
