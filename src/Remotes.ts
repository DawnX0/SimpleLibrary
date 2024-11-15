import Net from "@rbxts/net";

export = Net.CreateDefinitions({
	ActionLink: Net.Definitions.ClientToServerEvent<[string, boolean]>(),
});
