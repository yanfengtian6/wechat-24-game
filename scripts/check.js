const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const solver = require("../utils/solver");

const root = path.resolve(__dirname, "..");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: root,
    stdio: "pipe"
  });
}

function checkFiles() {
  const requiredFiles = [
    "app.js",
    "app.json",
    "app.wxss",
    "project.config.json",
    "sitemap.json",
    "pages/index/index.js",
    "pages/index/index.json",
    "pages/index/index.wxml",
    "pages/index/index.wxss",
    "pages/game/game.js",
    "pages/game/game.json",
    "pages/game/game.wxml",
    "pages/game/game.wxss",
    "pages/help/help.js",
    "pages/help/help.json",
    "pages/help/help.wxml",
    "pages/help/help.wxss",
    "utils/solver.js"
  ];

  requiredFiles.forEach((file) => {
    const fullPath = path.join(root, file);
    assert(fs.existsSync(fullPath), `Missing file: ${file}`);
    assert(fs.statSync(fullPath).size > 0, `Empty file: ${file}`);
  });

  const appJson = readJson(path.join(root, "app.json"));
  assert(appJson.pages.includes("pages/index/index"), "app.json missing index page");
  assert(appJson.pages.includes("pages/game/game"), "app.json missing game page");
  assert(appJson.pages.includes("pages/help/help"), "app.json missing help page");

  appJson.pages.forEach((pagePath) => {
    [".js", ".json", ".wxml", ".wxss"].forEach((extension) => {
      const file = `${pagePath}${extension}`;
      const fullPath = path.join(root, file);
      assert(fs.existsSync(fullPath), `Registered page file missing: ${file}`);
      assert(fs.statSync(fullPath).size > 0, `Registered page file empty: ${file}`);
    });
  });
}

function checkJson() {
  const jsonFiles = [
    "app.json",
    "project.config.json",
    "sitemap.json",
    "package.json",
    "pages/index/index.json",
    "pages/game/game.json",
    "pages/help/help.json"
  ];

  const privateConfig = path.join(root, "project.private.config.json");
  if (fs.existsSync(privateConfig)) {
    jsonFiles.push("project.private.config.json");
  }

  jsonFiles.forEach((file) => {
    readJson(path.join(root, file));
  });
}

function checkSyntax() {
  const jsFiles = [
    "app.js",
    "pages/index/index.js",
    "pages/game/game.js",
    "pages/help/help.js",
    "utils/solver.js",
    "scripts/check.js"
  ];

  jsFiles.forEach((file) => {
    run(process.execPath, ["--check", path.join(root, file)]);
  });
}

function findDevToolsCompiler(fileName) {
  const candidates = [];
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const programFiles = process.env.ProgramFiles;
  const localAppData = process.env.LOCALAPPDATA;

  if (programFilesX86) {
    candidates.push(
      path.join(programFilesX86, "Tencent", "微信web开发者工具", "code", "package.nw", "node_modules", "wcc-exec", fileName)
    );
  }

  if (programFiles) {
    candidates.push(
      path.join(programFiles, "Tencent", "微信web开发者工具", "code", "package.nw", "node_modules", "wcc-exec", fileName)
    );
  }

  if (localAppData) {
    candidates.push(
      path.join(localAppData, "微信开发者工具", "code", "package.nw", "node_modules", "wcc-exec", fileName)
    );
  }

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function checkMiniProgramCompiler() {
  const appJson = readJson(path.join(root, "app.json"));
  const wxmlFiles = appJson.pages.map((pagePath) => `${pagePath}.wxml`);
  const wxssFiles = ["app.wxss"].concat(appJson.pages.map((pagePath) => `${pagePath}.wxss`));
  const wcc = findDevToolsCompiler("wcc.exe");
  const wcsc = findDevToolsCompiler("wcsc.exe");

  if (wcc) {
    run(wcc, wxmlFiles);
  }

  if (wcsc) {
    run(wcsc, wxssFiles);
  }
}

function checkSolver() {
  const solvedCases = [
    [1, 2, 3, 4],
    [1, 5, 5, 5],
    [3, 3, 8, 8],
    [6, 6, 6, 6],
    [4, 7, 8, 8]
  ];

  solvedCases.forEach((numbers) => {
    assert(solver.solver24(numbers), `Solver failed: ${numbers.join(",")}`);
  });

  assert(solver.solve24([1, 1, 1, 1]) === null, "Unsolvable case detected as solvable");

  for (let i = 0; i < 100; i += 1) {
    const problem = solver.generateProblem();
    const values = problem.cards.map((card) => card.value);
    assert(problem.solution, "Generated problem missing solution");
    assert(solver.solve24(values), `Generated unsolvable problem: ${values.join(",")}`);
  }

  assert(solver.isTwentyFour(solver.calculate(20, 4, "+")), "Addition calculation failed");
  assert(solver.calculate(1, 0, "/") === null, "Division by zero was not blocked");
}

checkFiles();
checkJson();
checkSyntax();
checkMiniProgramCompiler();
checkSolver();

console.log("Check passed: files, JSON, JS syntax, Mini Program compiler, and solver are OK.");
