const solver = require("../../utils/solver");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function copyOperand(operand) {
  return {
    id: operand.id,
    label: operand.label,
    value: operand.value,
    suit: operand.suit,
    color: operand.color,
    expr: operand.expr,
    selected: operand.selected,
    isResult: operand.isResult,
    className: operand.className || ""
  };
}

function displayOperand(operand) {
  return operand.isResult ? operand.label : `${operand.label}${operand.suit}`;
}

function readNumber(key) {
  const value = Number(wx.getStorageSync(key) || 0);
  return Number.isFinite(value) ? value : 0;
}

function formatTime(seconds) {
  if (!seconds) {
    return "--";
  }

  return `${seconds}s`;
}

function buildPresentation({ operands, selectedIds, isSolved, isFailed, statusText }) {
  const count = operands.length;
  const gridCount = Math.max(Math.min(count, 4), 1);
  const opsDisabled = isSolved || isFailed || count < 2;
  const tableStateText = isSolved ? "已完成" : isFailed ? "未达成" : "进行中";
  const tableStateClass = isSolved ? "state-done" : isFailed ? "state-fail" : "state-playing";
  const statusPanelClass = isSolved
    ? "hint-bar success"
    : isFailed
      ? "hint-bar fail"
      : "hint-bar";

  let guideText = statusText || "";
  if (isFailed && operands[0]) {
    guideText = `结果是 ${operands[0].label}，不是 24。请撤销、重开或换一题。`;
  } else if (!isSolved && !isFailed) {
    if (selectedIds.length === 0) {
      guideText = "点击两张牌，再选运算符";
    } else if (selectedIds.length === 1) {
      const selected = operands.find((item) => item.id === selectedIds[0]);
      guideText = selected ? `已选 ${displayOperand(selected)}，再选一张` : "点击两张牌，再选运算符";
    } else {
      const left = operands.find((item) => item.id === selectedIds[0]);
      const right = operands.find((item) => item.id === selectedIds[1]);
      guideText =
        left && right
          ? `顺序：${displayOperand(left)} → ${displayOperand(right)}，请选运算`
          : "点击两张牌，再选运算符";
    }
  }

  return {
    operandGridClass: `operand-grid grid-${gridCount}`,
    opsDisabled,
    tableStateText,
    tableStateClass,
    statusPanelClass,
    guideText
  };
}

Page({
  history: [],
  roundStartedAt: 0,
  timer: null,

  data: {
    level: 0,
    sessionCorrect: 0,
    highestLevel: 0,
    totalCorrect: 0,
    fastestTime: 0,
    fastestTimeText: "--",
    elapsedSeconds: 0,
    elapsedTimeText: "0s",
    operands: [],
    originalCards: [],
    selectedIds: [],
    moveLogs: [],
    guideText: "点击两张牌，再选运算符",
    statusText: "",
    tableStateText: "进行中",
    tableStateClass: "state-playing",
    statusPanelClass: "hint-bar",
    operandGridClass: "operand-grid grid-4",
    opsDisabled: false,
    solution: "",
    answerHint: "",
    isSolved: false,
    isFailed: false
  },

  onLoad() {
    this.loadStats();
    this.startNewRound();
  },

  onShow() {
    if (this.data.operands.length && !this.data.isSolved && !this.data.isFailed) {
      this.startTimer();
    }
  },

  onHide() {
    this.stopTimer();
  },

  onUnload() {
    this.stopTimer();
  },

  loadStats() {
    const fastestTime = readNumber("fastestTime");

    this.setData({
      highestLevel: readNumber("highestLevel"),
      totalCorrect: readNumber("totalCorrect"),
      fastestTime,
      fastestTimeText: formatTime(fastestTime)
    });
  },

  setRoundState(patch) {
    const operands = patch.operands !== undefined ? patch.operands : this.data.operands;
    const selectedIds = patch.selectedIds !== undefined ? patch.selectedIds : this.data.selectedIds;
    const isSolved = patch.isSolved !== undefined ? patch.isSolved : this.data.isSolved;
    const isFailed = patch.isFailed !== undefined ? patch.isFailed : this.data.isFailed;
    const statusText = patch.statusText !== undefined ? patch.statusText : this.data.statusText;
    const presentation = buildPresentation({
      operands,
      selectedIds,
      isSolved,
      isFailed,
      statusText
    });

    this.setData(Object.assign({}, patch, presentation));
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (!this.roundStartedAt || this.data.isSolved || this.data.isFailed) {
        return;
      }

      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - this.roundStartedAt) / 1000));
      this.setData({
        elapsedSeconds,
        elapsedTimeText: formatTime(elapsedSeconds)
      });
    }, 1000);
  },

  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  startNewRound() {
    const problem = solver.generateProblem();
    const originalCards = problem.cards.map((card, index) => ({
      id: `c${index + 1}`,
      label: card.rank,
      value: card.value,
      suit: card.suit,
      color: card.color,
      expr: solver.formatValue(card.value),
      selected: false,
      isResult: false,
      className: card.color
    }));

    this.history = [];
    this.roundStartedAt = Date.now();
    this.setRoundState({
      level: this.data.level + 1,
      operands: clone(originalCards),
      originalCards,
      selectedIds: [],
      moveLogs: [],
      statusText: "",
      solution: problem.solution,
      answerHint: problem.hintText,
      isSolved: false,
      isFailed: false,
      elapsedSeconds: 0,
      elapsedTimeText: "0s"
    });
    this.startTimer();
  },

  restartRound() {
    if (this.data.isSolved) {
      wx.showToast({
        title: "已完成，请换一题",
        icon: "none"
      });
      return;
    }

    this.history = [];
    this.roundStartedAt = Date.now();
    this.setRoundState({
      operands: clone(this.data.originalCards).map((card) => {
        const nextCard = copyOperand(card);
        nextCard.selected = false;
        nextCard.className = `${nextCard.color}${nextCard.isResult ? " result" : ""}`;
        return nextCard;
      }),
      selectedIds: [],
      moveLogs: [],
      statusText: "",
      isSolved: false,
      isFailed: false,
      elapsedSeconds: 0,
      elapsedTimeText: "0s"
    });
    this.startTimer();
  },

  onSelect(event) {
    if (this.data.isSolved || this.data.isFailed) {
      return;
    }

    const id = event.currentTarget.dataset.id;
    if (!id) {
      return;
    }

    const selectedIds = this.data.selectedIds.slice();
    const existedIndex = selectedIds.indexOf(id);

    if (existedIndex >= 0) {
      selectedIds.splice(existedIndex, 1);
    } else if (selectedIds.length < 2) {
      selectedIds.push(id);
    } else {
      selectedIds.splice(0, 1);
      selectedIds.push(id);
    }

    const operands = this.data.operands.map((operand) => ({
      id: operand.id,
      label: operand.label,
      value: operand.value,
      suit: operand.suit,
      color: operand.color,
      expr: operand.expr,
      isResult: operand.isResult,
      selected: selectedIds.indexOf(operand.id) >= 0
    }));
    operands.forEach((operand) => {
      operand.className = `${operand.color}${operand.selected ? " selected" : ""}${operand.isResult ? " result" : ""}`;
    });

    this.setRoundState({
      operands,
      selectedIds,
      statusText: ""
    });
  },

  onOperate(event) {
    if (this.data.isSolved || this.data.isFailed || this.data.opsDisabled) {
      return;
    }

    const operator = event.currentTarget.dataset.op;
    const selectedIds = this.data.selectedIds;

    if (selectedIds.length !== 2) {
      wx.showToast({
        title: "先选两张牌",
        icon: "none"
      });
      return;
    }

    const left = this.data.operands.find((operand) => operand.id === selectedIds[0]);
    const right = this.data.operands.find((operand) => operand.id === selectedIds[1]);

    if (!left || !right) {
      wx.showToast({
        title: "选择已失效",
        icon: "none"
      });
      this.setRoundState({
        selectedIds: [],
        statusText: ""
      });
      return;
    }

    const resultValue = solver.calculate(left.value, right.value, operator);
    if (resultValue === null || !Number.isFinite(resultValue)) {
      wx.showToast({
        title: "不能除以 0",
        icon: "none"
      });
      return;
    }

    this.history.push({
      operands: clone(this.data.operands),
      selectedIds: clone(this.data.selectedIds),
      moveLogs: clone(this.data.moveLogs),
      isSolved: this.data.isSolved,
      isFailed: this.data.isFailed,
      statusText: this.data.statusText
    });

    const label = solver.formatValue(resultValue);
    const symbol = solver.operatorLabel(operator);
    const expr = `(${left.expr} ${symbol} ${right.expr})`;
    const resultOperand = {
      id: `r${Date.now()}${Math.floor(Math.random() * 1000)}`,
      label,
      value: resultValue,
      suit: "",
      color: resultValue < 0 ? "red" : "black",
      expr,
      selected: false,
      isResult: true
    };
    const selectedSet = {};
    selectedSet[left.id] = true;
    selectedSet[right.id] = true;
    const operands = this.data.operands
      .filter((operand) => !selectedSet[operand.id])
      .concat(resultOperand);
    const moveLogs = this.data.moveLogs.concat(
      `${displayOperand(left)} ${symbol} ${displayOperand(right)} = ${label}`
    );
    operands.forEach((operand) => {
      operand.className = `${operand.color}${operand.selected ? " selected" : ""}${operand.isResult ? " result" : ""}`;
    });

    const solved = operands.length === 1 && solver.isTwentyFour(resultValue);
    const failed = operands.length === 1 && !solved;

    this.setRoundState({
      operands,
      selectedIds: [],
      moveLogs,
      isSolved: solved,
      isFailed: failed,
      statusText: solved ? `成功得到 24：${expr}` : ""
    });

    if (solved) {
      this.finishRound(expr);
    } else if (failed) {
      this.stopTimer();
    }
  },

  finishRound(expr) {
    this.stopTimer();

    const usedSeconds = Math.max(1, Math.floor((Date.now() - this.roundStartedAt) / 1000));
    const fastestTime = this.data.fastestTime
      ? Math.min(this.data.fastestTime, usedSeconds)
      : usedSeconds;
    const highestLevel = Math.max(this.data.highestLevel, this.data.level);
    const totalCorrect = this.data.totalCorrect + 1;
    const sessionCorrect = this.data.sessionCorrect + 1;

    wx.setStorageSync("highestLevel", highestLevel);
    wx.setStorageSync("totalCorrect", totalCorrect);
    wx.setStorageSync("fastestTime", fastestTime);

    this.setData({
      highestLevel,
      totalCorrect,
      fastestTime,
      fastestTimeText: formatTime(fastestTime),
      sessionCorrect,
      elapsedSeconds: usedSeconds,
      elapsedTimeText: formatTime(usedSeconds)
    });

    wx.showModal({
      title: "闯关成功",
      content: "恭喜你，算出了24",
      confirmText: "继续",
      showCancel: false
    });
  },

  undo() {
    if (this.data.isSolved) {
      wx.showToast({
        title: "已完成，请换一题",
        icon: "none"
      });
      return;
    }

    if (!this.history.length) {
      wx.showToast({
        title: "没有可撤销步骤",
        icon: "none"
      });
      return;
    }

    const snapshot = this.history.pop();
    this.setRoundState(snapshot);

    if (!snapshot.isSolved && !snapshot.isFailed) {
      this.startTimer();
    } else {
      this.stopTimer();
    }
  },

  showHint() {
    wx.showModal({
      title: "提示答案",
      content: this.data.answerHint || this.data.solution || "这题暂时没有提示。",
      confirmText: "知道了",
      showCancel: false
    });
  },

  voiceTodo() {
    wx.showToast({
      title: "语音识别敬请期待",
      icon: "none"
    });
  },

  onShareAppMessage() {
    return {
      title: "24 点扑克小游戏",
      path: "/pages/index/index"
    };
  }
});
