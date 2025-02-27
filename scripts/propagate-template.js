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

// Function to check if a file contains the @no-propagate-template marker
function shouldSkipFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, "utf8");
  return content.includes("@no-propagate-template");
}

// Function to copy a file from source to destination
function copyFile(source, destination) {
  const destinationDir = path.dirname(destination);

  // Create directories if they don't exist
  if (!fs.existsSync(destinationDir)) {
    fs.mkdirSync(destinationDir, { recursive: true });
  }

  // Skip propagation if the destination file contains the marker
  if (fs.existsSync(destination) && shouldSkipFile(destination)) {
    console.log(
      `Skipping propagation for ${destination} (contains @no-propagate-template)`
    );
    return;
  }

  // Copy the file
  fs.copyFileSync(source, destination);
  console.log(`Copied ${source} to ${destination}`);
}

// Main function
function propagateTemplate(templateDir, directories, fileList) {
  directories.forEach((targetDir) => {
    fileList.forEach((file) => {
      const source = path.join(templateDir, file);
      const destination = path.join(targetDir, file);

      if (fs.existsSync(source)) {
        copyFile(source, destination);
      } else {
        console.warn(`Template file ${source} does not exist. Skipping.`);
      }
    });
  });
}

// Get arguments from the command line
const args = process.argv.slice(2);

// Extract excluded directories
const excludedDirs = args
  .filter((arg) => arg.startsWith("--exclude="))
  .map((arg) => arg.replace("--exclude=", ""));

// Extract or default the template directory
let templateDir = args
  .find((arg) => arg.startsWith("--template="))
  ?.replace("--template=", "");
if (!templateDir) {
  templateDir = path.resolve("./templates/");
}

if (!fs.existsSync(templateDir)) {
  console.error(`Error: Template directory ${templateDir} does not exist.`);
  process.exit(1);
}

// Define files to propagate
const filesToPropagate = [
  "Dockerfile",
  "Dockerfile.production",
  "tsconfig.prod.json",
];

const directories = findDirectoriesWithPackageJson(process.cwd(), excludedDirs);
console.log("Directories with package.json:", directories);
console.log("Excluded directories:", excludedDirs);
console.log("Using template directory:", templateDir);

if (directories.length === 0) {
  console.error("No directories with package.json found.");
  process.exit(1);
}

// Propagate template files
console.log(`Propagating files from template: ${templateDir}`);
propagateTemplate(templateDir, directories, filesToPropagate);
