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
    assert(fs.existsSync(fullPath), `缺少文件: ${file}`);
    assert(fs.statSync(fullPath).size > 0, `文件为空: ${file}`);
  });

  const appJson = readJson(path.join(root, "app.json"));
  assert(appJson.pages.includes("pages/index/index"), "app.json 缺少首页");
  assert(appJson.pages.includes("pages/game/game"), "app.json 缺少游戏页");
  assert(appJson.pages.includes("pages/help/help"), "app.json 缺少帮助页");

  appJson.pages.forEach((pagePath) => {
    [".js", ".json", ".wxml", ".wxss"].forEach((extension) => {
      const file = `${pagePath}${extension}`;
      const fullPath = path.join(root, file);
      assert(fs.existsSync(fullPath), `app.json 注册页面缺少文件: ${file}`);
      assert(fs.statSync(fullPath).size > 0, `app.json 注册页面文件为空: ${file}`);
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
    execFileSync(process.execPath, ["--check", path.join(root, file)], {
      stdio: "pipe"
    });
  });
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
    assert(solver.solver24(numbers), `求解失败: ${numbers.join(",")}`);
  });

  assert(solver.solve24([1, 1, 1, 1]) === null, "无解题误判为有解");

  for (let i = 0; i < 100; i += 1) {
    const problem = solver.generateProblem();
    const values = problem.cards.map((card) => card.value);
    assert(problem.solution, "生成题目缺少答案");
    assert(solver.solve24(values), `生成了无解题: ${values.join(",")}`);
  }

  assert(solver.isTwentyFour(solver.calculate(20, 4, "+")), "加法计算异常");
  assert(solver.calculate(1, 0, "/") === null, "除零未被拦截");
}

checkFiles();
checkJson();
checkSyntax();
checkSolver();

console.log("检查通过：项目文件、JS 语法和 24 点求解器均正常。");
