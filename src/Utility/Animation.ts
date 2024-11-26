import Remotes from "../SimpleLibrary/Remotes";
import { GetAnimator } from "./GetAnimator";

export function PlayAnimation(
	model: Model,
	animationId: string,
	name?: string,
	priority?: Enum.AnimationPriority,
	speed?: number,
	markers?: Map<string, (model: Model) => void>,
) {
	const animator = GetAnimator(model);
	if (!animator) error("No animator found in: " + model.Name);

	const animInstance = new Instance("Animation");
	animInstance.Name = name || "Animation";

	try {
		animInstance.AnimationId = animationId;
	} catch (e) {
		error("Invalid Animation ID: " + animationId);
	}

	const track = animator.LoadAnimation(animInstance);
	track.Priority = priority || Enum.AnimationPriority.Action;
	track.AdjustSpeed(speed);
	track.Ended.Once(() => animInstance.Destroy());

	if (markers) {
		const markerLink = Remotes.Client.Get("MarkerLink");
		markers.forEach((v, markerName) => {
			task.spawn(() => {
				if (!v) return;
				track.GetMarkerReachedSignal(markerName).Once(() => {
					markerLink.SendToServer(markerName);
				});
			});
		});
		track.KeyframeReached.Connect((keyframeName: string) => {
			print(keyframeName);
			const marker = markers.get(keyframeName);
			if (marker) {
				markerLink.SendToServer(keyframeName);
			} else warn("Unbinded marker: " + keyframeName);
		});
	}
	track.Play();
}

export function StopAnimation(animator: Animator, name: string) {
	animator.GetPlayingAnimationTracks().forEach((track) => {
		if (track.Name.lower() === name.lower()) {
			track.Stop();
		}
	});
}
