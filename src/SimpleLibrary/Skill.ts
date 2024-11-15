import { ReplicatedStorage, RunService } from "@rbxts/services";

export type SkillType = {
	Name: string;
	Cooldown: number;
	Interaction: "Tap" | "Hold";
	Description?: string;
	Icon?: string;

	Client: (arg_0: Model) => void;
	Server: (arg_0: Model) => void;
};

const FOLDER_NAME = "Skills";

class Skill {
	SkillRegistry: Map<string, SkillType> = new Map();

	constructor() {
		this.RegisterSkills();
	}

	RegisterSkills() {
		const folder = ReplicatedStorage.FindFirstChild(FOLDER_NAME, true);
		if (folder) {
			for (const child of folder.GetChildren()) {
				if (child.IsA("ModuleScript")) {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const reqChild = require(child) as SkillType;

					if (this.SkillRegistry.has(reqChild.Name.lower())) {
						error(`Action with name "${reqChild.Name}" already exists.`);
					}
					this.SkillRegistry.set(reqChild.Name.lower(), reqChild);
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	Cast(model: Model) {
		if (RunService.IsClient()) {
			// Client-side logic here
		} else if (RunService.IsServer()) {
			// Server-side logic here
		}
	}
}

export default new Skill();
