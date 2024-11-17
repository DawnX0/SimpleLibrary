import { RunService } from "@rbxts/services";

export function CheckAttributes(instance: Model | BasePart, attributes: string[]): boolean {
	return attributes.some((attribute) => {
		const value = instance.GetAttribute(attribute.lower());
		if (value !== undefined && value !== false) {
			return true;
		}
		return false;
	});
}
