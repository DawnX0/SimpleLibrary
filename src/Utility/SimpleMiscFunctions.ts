import { Workspace } from "@rbxts/services";
import Remotes from "../SimpleLibrary/Remotes";

export function GetAnimator(model: Model): Animator | undefined {
	return model.FindFirstChildWhichIsA("Humanoid")?.FindFirstChildOfClass("Animator");
}

export function GenerateUID(): string {
	const uniqueTick = tick(); // Get the time in seconds since the game started
	const randomValue = math.floor(math.random() * 1000000); // Generate a random number
	return `${uniqueTick}-${randomValue}`;
}

export function CheckAttributes(instance: Model | BasePart, attributes: string[]): boolean {
	return attributes.some((attribute) => {
		const existingAttribute = instance.GetAttribute(attribute);
		if (existingAttribute !== undefined && existingAttribute !== false) {
			return true;
		}

		for (const [foundAttribute, value] of instance.GetAttributes()) {
			if (foundAttribute.lower() === attribute.lower()) {
				if (value !== undefined && value !== false) {
					return true;
				}
			}
		}
		return false;
	});
}

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

export function StopAnimation(model: Model, name: string) {
	const animator = GetAnimator(model) || new Instance("Animator", model.FindFirstChildWhichIsA("Humanoid")!);
	if (!animator) error("No animator found in: " + model.Name);

	animator.GetPlayingAnimationTracks().forEach((track) => {
		if (track.Name.lower() === name.lower()) {
			track.Stop();
		}
	});
}

export function StopAllAnimations(model: Model) {
	const animator = GetAnimator(model);
	if (!animator) error("No animator found in: " + model.Name);

	animator.GetPlayingAnimationTracks().forEach((track) => {
		track.Stop();
	});
}

export function PlaySound(soundId: string, data: { parent?: Instance; name?: string; loudness?: number }) {
	const { parent, name, loudness } = data;

	const sound = new Instance("Sound");
	sound.SoundId = soundId;
	sound.Parent = parent || Workspace;
	sound.Name = name || "Sound";
	sound.Volume = loudness || 0.5;
	sound.Play();
	sound.Ended.Once(() => sound.Destroy());
}

export function StopSound(soundName: string, entity: Instance) {
	const sound = entity.FindFirstChild(soundName) as Sound | undefined;
	if (sound) {
		sound.Stop();
		sound.Destroy();
	}
}
