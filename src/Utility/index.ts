import { SimpleAssignWeapon, SimpleBasicATK, SimpleBlock, SimpleEquip, SimpleHeavyATK } from "./SimpleWeaponFunctions";
import { SimpleCastSkill } from "./SimpleSkillFunctions";
import { SimpleApplySE, SimpleRemoveSE } from "./SimpleSEFunctions";
import { SimpleKnockback } from "./SimpleKnockback";
import {
	CheckAttributes,
	GenerateUID,
	GetAnimator,
	PlayAnimation,
	PlaySound,
	StopAllAnimations,
	StopAnimation,
	StopSound,
} from "./SimpleMiscFunctions";

export default {
	// Animation
	PlayAnimation,
	StopAnimation,
	StopAllAnimations,

	// Weapon
	SimpleAssignWeapon,
	SimpleEquip,
	SimpleBasicATK,
	SimpleHeavyATK,
	SimpleBlock,

	// Status Effect
	SimpleRemoveSE,
	SimpleApplySE,

	// Skill
	SimpleCastSkill,

	// Misc
	GenerateUID,
	GetAnimator,
	CheckAttributes,
	SimpleKnockback,
	PlaySound,
	StopSound,
};
