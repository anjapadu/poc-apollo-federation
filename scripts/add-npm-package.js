const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Function to recursively find directories with a package.json, ignoring node_modules and excluded directories
function findDirectoriesWithPackageJson(startPath, excludedDirs) {
  const directories = [];

  function traverseDirectory(dir) {
    if (path.basename(dir) === "node_modules" || dir.startsWith(".")) return;

    // Skip excluded directories
    if (excludedDirs.some((excludedDir) => dir.includes(excludedDir))) return;

    const files = fs.readdirSync(dir, { withFileTypes: true });

    files.forEach((file) => {
      const fullPath = path.join(dir, file.name);

      if (file.isDirectory()) {
        traverseDirectory(fullPath);
      } else if (file.isFile() && file.name === "package.json") {
        directories.push(dir); // Add the directory containing package.json
      }
    });
  }

  traverseDirectory(startPath);
  return directories;
}

// Get packages to add from command-line arguments
const args = process.argv.slice(2);

// Extract packages and exclusions
const packagesToAdd = args.filter((arg) => !arg.startsWith("--exclude="));
const excludedDirs = args
  .filter((arg) => arg.startsWith("--exclude="))
  .map((arg) => arg.replace("--exclude=", ""));

if (packagesToAdd.length === 0) {
  console.error("Error: No packages specified. Pass packages as arguments.");
  console.error("Example: node script.js lodash express --exclude=cdk");
  process.exit(1);
}

console.log("Packages to install:", packagesToAdd);
console.log("Directories to exclude:", excludedDirs);

const directories = findDirectoriesWithPackageJson(process.cwd(), excludedDirs);
console.log("Directories with package.json:", directories);

if (directories.length === 0) {
  console.error("No directories with package.json found.");
  process.exit(1);
}

// Create the install commands
const commands = directories.map(
  (dir) => `yarn --cwd "${dir}" add ${packagesToAdd.join(" ")}`
);

console.log("Running commands:", commands);

commands.forEach((command) => {
  exec(command, (err, stdout, stderr) => {
    if (err) {
      console.error(`Error installing packages in ${command}:`, stderr);
    } else {
      console.log(`Packages installed with command: ${command}\n`, stdout);
    }
  });
});
