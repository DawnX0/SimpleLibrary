import { RunService, TweenService } from "@rbxts/services";

export type KnockbackData = {
	hitModel: Model;
	direction: Vector3;
	duration: number;
	force: number;
};

export function SimpleKnockback(hitModel: Model, direction: Vector3, duration: number, force: number) {
	if (RunService.IsServer()) {
		const rootPart = hitModel.FindFirstChild("HumanoidRootPart") as BasePart;
		if (!rootPart) return;

		TweenService.Create(rootPart, new TweenInfo(duration, Enum.EasingStyle.Quad), {
			AssemblyLinearVelocity: direction.mul(force),
		}).Play();

		// rootPart.AssemblyLinearVelocity = direction.mul(force);
	}
}
