import { spawn } from "child_process";
import { watch } from "fs";
import { exec } from "child_process";

let serverProcess;

const startServer = () => {
  if (serverProcess) {
    console.log("Restarting server...");
    serverProcess.kill();
  }
  serverProcess = spawn("node", ["dist/index.js"], { stdio: "inherit" });
};

const rebuildProject = () => {
  console.log("Rebuilding project...");
  exec("yarn build", (err, stdout, stderr) => {
    if (err) {
      console.error(`Build error: ${stderr}`);
    } else {
      console.log(stdout);
      startServer();
    }
  });
};

watch("./src", { recursive: true }, (eventType, filename) => {
  if (filename) {
    console.log(`File changed: ${filename}`);
    rebuildProject();
  }
});

rebuildProject();

process.on("SIGINT", () => {
  if (serverProcess) serverProcess.kill();
  process.exit();
});
