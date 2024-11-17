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

					try {
						if (this.SkillRegistry.get(reqChild.Name.lower())) {
							error(`"${reqChild.Name}" already exists.`);
						}
						this.SkillRegistry.set(reqChild.Name.lower(), reqChild);
					} catch (e) {
						warn(`code execution stopped: ${child.Name} is an empty file found in ${FOLDER_NAME}`);
						return;
					}
				}
			}
		} else error(`Could not find ${FOLDER_NAME} folder`);
	}

	Cast(model: Model, skillName: string) {
		const skill = this.SkillRegistry.get(skillName.lower());

		if (!skill) {
			error(`Skill "${skillName}" not found.`);
			return;
		}

		if (RunService.IsClient()) {
			skill.Client(model);
		} else if (RunService.IsServer()) {
			model.SetAttribute(skill.Name.lower(), true);
			task.delay(skill.Cooldown, () => model.SetAttribute(skill.Name.lower(), false));

			skill.Server(model);
		}
	}
}

export default new Skill();
