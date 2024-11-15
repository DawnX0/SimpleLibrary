export function PlayAnimation(animator: Animator, animationId: string, name?: string) {
    const animInstance = new Instance("Animation")
    animInstance.Name = name || "Animation"

    try {
        animInstance.AnimationId = animationId;
    } catch (e){
        error("Invalid Animation ID: " + animationId)
    }

    const track = animator.LoadAnimation(animInstance);
    track.Play();
    track.Ended.Once(() => animInstance.Destroy());
}

export function StopAnimation(animator: Animator, name: string) {
    animator.GetPlayingAnimationTracks().forEach((track,) => {
        if (track.Name === name) {
            track.Stop();
        }
    })
}