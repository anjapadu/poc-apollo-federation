const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Function to recursively find directories with a package.json, ignoring node_modules
function findDirectoriesWithPackageJson(startPath) {
  const directories = [];

  function traverseDirectory(dir) {
    if (path.basename(dir) === "node_modules" || dir.startsWith(".")) return;

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

const directories = findDirectoriesWithPackageJson(process.cwd());
console.log("Directories with package.json:", directories);

const commands = directories
  .map((dir) => `yarn --cwd "${dir}" install`)
  .join(" && ");
console.log("Running:", commands);

exec(`concurrently "${commands}"`, (err, stdout, stderr) => {
  if (err) {
    console.error(`Error: ${stderr}`);
  } else {
    console.log(stdout);
  }
});
