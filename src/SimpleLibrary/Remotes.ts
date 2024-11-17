import Net from "@rbxts/net";

export = Net.CreateDefinitions({
	ActionLink: Net.Definitions.ClientToServerEvent<[string, boolean]>(),
	MarkerLink: Net.Definitions.ClientToServerEvent<[string]>(),
	WeaponLink: Net.Definitions.ServerToClientEvent<[Model, number]>(),
	KnockbackLink: Net.Definitions.BidirectionalEvent<
		[Model, Vector3, number, number],
		[Model, Vector3, number, number]
	>(),
});
