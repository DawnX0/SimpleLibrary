import { Dumpster } from "@rbxts/dumpster";
import { generateUID } from "../Utility/GenUID";
import Signal from "@rbxts/signal";

export type TimerType = {
	Name: string;
	Duration: number;
	Tick: number;
	RemainingTime: number;
	IsRunning: boolean;
	TimerThread: thread | undefined;
	State: string;
	UID: string;
	Dumpster: Dumpster;
	Signal: Signal<(state: string) => void>;

	Start: () => void;
	Stop: () => void;
	Destroy(): void;
	OnExpired?: <T>(arg_0?: T) => void;
	OnTick?: <T>(arg_0?: T) => void;
};

export const TimerState = {
	INACTIVE: "Inactive",
	RUNNING: "Running",
	STOPPED: "Stopped",
	DESTROYED: "Destroyed",
};

class Timer {
	TimerRegistry: Map<string, TimerType> = new Map();

	Create(timerData: {
		Name: string;
		Duration: number;
		Tick?: number;
		OnExpired?: <T>(arg_0?: T) => void;
		OnTick?: <T>(arg_0?: T) => void;
	}): TimerType {
		const { Name, Duration, Tick, OnExpired, OnTick } = timerData;

		const newTimer: TimerType = {
			Name: Name,
			Duration: Duration,
			Tick: Tick || 1,
			RemainingTime: Duration,
			IsRunning: false,
			TimerThread: undefined,
			State: TimerState.INACTIVE,
			UID: generateUID(),
			Dumpster: new Dumpster(),
			Signal: new Signal(),

			Start: () => {
				if (!newTimer.IsRunning) {
					newTimer.IsRunning = true;
					newTimer.State = TimerState.RUNNING;
					newTimer.Signal.Fire(newTimer.State);
					newTimer.TimerThread = task.spawn(() => {
						this.Update(newTimer);
					});
				} else warn("Already started");
			},

			Stop: () => {
				if (newTimer.IsRunning) {
					newTimer.IsRunning = false;
					newTimer.State = TimerState.STOPPED;
					newTimer.Signal.Fire(newTimer.State);
				} else warn("Already stopped");
			},

			Destroy() {
				if (this.State === TimerState.DESTROYED) return;

				if (this.IsRunning) {
					this.Stop();
				}

				if (this.TimerThread) {
					task.cancel(this.TimerThread);
					this.TimerThread = undefined;
				}

				newTimer.State = TimerState.DESTROYED;
				newTimer.Signal.Fire(newTimer.State);

				this.Dumpster.burn();

				print(`Timer '${this.Name}' has been destroyed.`);
			},

			OnExpired,
			OnTick,
		};

		newTimer.Dumpster.dump(() => newTimer.OnTick);
		newTimer.Dumpster.dump(() => newTimer.OnExpired);
		newTimer.Dumpster.dump(() => newTimer.Start);
		newTimer.Dumpster.dump(() => newTimer.Stop);
		newTimer.Dumpster.dump(newTimer.Signal);

		this.TimerRegistry.set(newTimer.UID, newTimer);

		return newTimer;
	}

	Update(timer: TimerType) {
		while (timer.RemainingTime > 0 && timer.IsRunning) {
			task.wait(timer.Tick);
			timer.RemainingTime -= timer.Tick;

			if (timer.OnTick) {
				timer.OnTick(timer.RemainingTime);
			}
		}

		// Call OnExpired once the timer runs out
		if (timer.RemainingTime <= 0 && timer.OnExpired) {
			timer.OnExpired();
		}

		if (timer.RemainingTime <= 0) {
			if (timer.OnExpired) {
				timer.OnExpired();
			}
		}
	}
}

export default new Timer();
