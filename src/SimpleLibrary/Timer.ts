import { generateUID } from "../Utility/GenUID";

export type TimerType = {
	Name: string;
	Duration: number;
	Tick: number;
	RemainingTime: number;
	IsRunning: boolean;
	TimerThread: thread | undefined;
	UID: string;

	Start: () => void;
	Stop: () => void;
	Destroy: () => void;
	OnExpired?<T>(): (arg_0: T) => void;
	OnTick?<T>(): (arg_0: T) => void;
};

class Timer {
	TimerRegistry: Map<string, TimerType> = new Map();

	Create(timerData: {
		Name: string;
		Duration: number;
		Tick?: number;
		OnExpired?<T>(): (arg_0: T) => void;
		OnTick?<T>(): (arg_0: T) => void;
	}) {
		const { Name, Duration, Tick, OnExpired, OnTick } = timerData;

		const newTimer: TimerType = {
			Name: Name,
			Duration: Duration,
			Tick: Tick || 1,
			RemainingTime: Duration,
			IsRunning: false,
			TimerThread: undefined,
			UID: generateUID(),

			Start() {
				if (!this.IsRunning) {
					this.IsRunning = true;
				} else warn("Already started");
			},

			Stop() {
				if (this.IsRunning) {
					this.IsRunning = false;
				} else warn("Already stopped");
			},

			Destroy() {
				if (this.IsRunning) {
					this.Stop();
				}

				if (this.TimerThread) {
					task.cancel(this.TimerThread);
					this.TimerThread = undefined;
				}

				this.OnTick = undefined;
				this.OnExpired = undefined;
				this.IsRunning = false;

				print(`Timer '${this.Name}' has been destroyed.`);
			},

			OnExpired: OnExpired,
			OnTick: OnTick,
		};

		this.TimerRegistry.set(newTimer.UID, newTimer);
	}

	Update(timer: TimerType) {
		while (timer.RemainingTime > 0 && timer.IsRunning) {
			task.wait(timer.Tick);
			timer.RemainingTime -= 1;
			if (timer.OnTick) {
				timer.OnTick();
			}
		}

		if (timer.RemainingTime <= 0) {
			if (timer.OnExpired) {
				timer.OnExpired();
			}
		}
	}
}

export default new Timer();
