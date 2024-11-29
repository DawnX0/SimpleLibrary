import Net from "@rbxts/net";
import { WEAPONLINK_MESSAGE } from "./Weapon";
import { KnockbackData } from "../Utility/SimpleKnockback";

export = Net.CreateDefinitions({
	ActionLink: Net.Definitions.ClientToServerEvent<[string, boolean]>(),
	MarkerLink: Net.Definitions.ClientToServerEvent<[string]>(),
	WeaponLink: Net.Definitions.ServerToClientEvent<[Model, string, WEAPONLINK_MESSAGE]>(),
	KnockbackLink: Net.Definitions.ServerToClientEvent<[KnockbackData]>(),
});
