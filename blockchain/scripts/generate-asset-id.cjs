const { randomBytes } = require("node:crypto");

// Generate opaque, non-sequential identifiers. Do not derive IDs from serial
// numbers, unit names, coordinates, classified labels, or other guessable data.
for (let i = 0; i < 3; i += 1) {
  console.log(`bytes32 id ${i + 1}: 0x${randomBytes(32).toString("hex")}`);
}
