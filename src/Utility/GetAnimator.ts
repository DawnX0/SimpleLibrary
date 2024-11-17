export function GetAnimator(model: Model): Animator | undefined {
	return model.FindFirstChildWhichIsA("Humanoid")?.FindFirstChildOfClass("Animator");
}
