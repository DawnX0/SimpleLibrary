export function generateUID(): string {
	const uniqueTick = tick(); // Get the time in seconds since the game started
	const randomValue = math.floor(math.random() * 1000000); // Generate a random number
	return `${uniqueTick}-${randomValue}`;
}
