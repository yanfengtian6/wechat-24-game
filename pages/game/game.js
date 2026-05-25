const solver = require("../../utils/solver");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function displayOperand(operand) {
  return operand.isResult ? operand.label : `${operand.label}${operand.suit}`;
}

Page({
  history: [],

  data: {
    score: 0,
    highestScore: 0,
    round: 0,
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
    const highestScore = wx.getStorageSync("highestScore") || 0;
    this.setData({ highestScore });
    this.startNewRound();
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
    this.setData({
      round: this.data.round + 1,
      operands: clone(originalCards),
      originalCards,
      selectedIds: [],
      selectedText: "请选择两张牌",
      moveLogs: [],
      statusText: "点击两张牌，再选择运算符。",
      solution: problem.solution,
      isSolved: false
    });
  },

  restartRound() {
    if (this.data.isSolved) {
      wx.showToast({
        title: "已完成，请下一题",
        icon: "none"
      });
      return;
    }

    this.history = [];
    this.setData({
      operands: clone(this.data.originalCards).map((card) => ({
        ...card,
        selected: false
      })),
      selectedIds: [],
      selectedText: "本题已重开",
      moveLogs: [],
      statusText: "重新选择两张牌开始运算。",
      isSolved: false
    });
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

    const nextData = {
      operands,
      selectedIds: [],
      selectedText: "请选择两张牌",
      moveLogs,
      statusText: solved ? `成功得到 24：${expr}` : "继续选择两张牌。",
      isSolved: solved
    };

    if (solved) {
      const score = this.data.score + 1;
      const highestScore = Math.max(score, this.data.highestScore);
      wx.setStorageSync("highestScore", highestScore);
      nextData.score = score;
      nextData.highestScore = highestScore;

      wx.showToast({
        title: "解出 24",
        icon: "success"
      });
    }

    this.setData(nextData);
  },

  undo() {
    if (this.data.isSolved) {
      wx.showToast({
        title: "已完成，请下一题",
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
      title: "提示",
      content: this.data.solution || "这题暂时没有提示。",
      confirmText: "知道了",
      showCancel: false
    });
  },

  onShareAppMessage() {
    return {
      title: "24 点扑克小游戏",
      path: "/pages/index/index"
    };
  }
});
