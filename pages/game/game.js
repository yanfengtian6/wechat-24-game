const solver = require("../../utils/solver");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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
    selectedText: "请选择两张牌",
    moveLogs: [],
    statusText: "点击两张牌，再选择运算符。",
    solution: "",
    isSolved: false
  },

  onLoad() {
    this.loadStats();
    this.startNewRound();
  },

  onShow() {
    if (this.data.operands.length && !this.data.isSolved) {
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

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => {
      if (!this.roundStartedAt || this.data.isSolved) {
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
      isResult: false
    }));

    this.history = [];
    this.roundStartedAt = Date.now();
    this.setData({
      level: this.data.level + 1,
      operands: clone(originalCards),
      originalCards,
      selectedIds: [],
      selectedText: "请选择两张牌",
      moveLogs: [],
      statusText: "点击两张牌，再选择运算符。",
      solution: problem.solution,
      isSolved: false,
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
    this.setData({
      operands: clone(this.data.originalCards).map((card) => ({
        ...card,
        selected: false
      })),
      selectedIds: [],
      selectedText: "本题已重开",
      moveLogs: [],
      statusText: "重新选择两张牌开始运算。",
      isSolved: false,
      elapsedSeconds: 0,
      elapsedTimeText: "0s"
    });
    this.startTimer();
  },

  onSelect(event) {
    if (this.data.isSolved) {
      return;
    }

    const id = event.currentTarget.dataset.id;
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

    this.applySelection(selectedIds);
  },

  applySelection(selectedIds) {
    const operands = this.data.operands.map((operand) => ({
      ...operand,
      selected: selectedIds.indexOf(operand.id) >= 0
    }));
    const selectedOperands = selectedIds
      .map((id) => operands.find((operand) => operand.id === id))
      .filter(Boolean);

    let selectedText = "请选择两张牌";
    if (selectedOperands.length === 1) {
      selectedText = `已选择 ${displayOperand(selectedOperands[0])}`;
    }
    if (selectedOperands.length === 2) {
      selectedText = `顺序：${displayOperand(selectedOperands[0])} -> ${displayOperand(selectedOperands[1])}`;
    }

    this.setData({
      operands,
      selectedIds,
      selectedText
    });
  },

  onOperate(event) {
    if (this.data.isSolved) {
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
      this.applySelection([]);
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
      selectedText: this.data.selectedText,
      moveLogs: clone(this.data.moveLogs),
      statusText: this.data.statusText,
      isSolved: this.data.isSolved
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
    const solved = operands.length === 1 && solver.isTwentyFour(resultValue);
    const failed = operands.length === 1 && !solved;

    this.setData({
      operands,
      selectedIds: [],
      selectedText: "请选择两张牌",
      moveLogs,
      statusText: solved
        ? `成功得到 24：${expr}`
        : failed
          ? "最后结果不是 24，可以撤销或重开。"
          : "继续选择两张牌。",
      isSolved: solved
    });

    if (solved) {
      this.finishRound(expr);
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
    this.setData(snapshot);
  },

  showHint() {
    wx.showModal({
      title: "提示答案",
      content: this.data.solution || "这题暂时没有提示。",
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
