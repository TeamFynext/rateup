const fs = require("fs");

// Read the JSON file
const rawData = fs.readFileSync("hi.json", "utf8");
const jsonData = JSON.parse(rawData);

// Create a new object with keys that have '.' removed
const fixedData = {};
for (const key in jsonData) {
  const newKey = key.replace(/\./g, ""); // remove all dots from key
  fixedData[newKey] = jsonData[key];
}

// Write back to a new file
fs.writeFileSync("data.fixed.json", JSON.stringify(fixedData, null, 2), "utf8");

console.log("✅ Keys fixed and saved to data.fixed.json");
