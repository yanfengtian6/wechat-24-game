const TARGET = 24;
const EPSILON = 1e-6;

const SUITS = [
  { suit: "♠", color: "black" },
  { suit: "♥", color: "red" },
  { suit: "♦", color: "red" },
  { suit: "♣", color: "black" }
];

const RANKS = [
  { rank: "A", value: 1 },
  { rank: "2", value: 2 },
  { rank: "3", value: 3 },
  { rank: "4", value: 4 },
  { rank: "5", value: 5 },
  { rank: "6", value: 6 },
  { rank: "7", value: 7 },
  { rank: "8", value: 8 },
  { rank: "9", value: 9 },
  { rank: "10", value: 10 },
  { rank: "J", value: 11 },
  { rank: "Q", value: 12 },
  { rank: "K", value: 13 }
];

function isTwentyFour(value) {
  return Math.abs(value - TARGET) < EPSILON;
}

function isNearInteger(value) {
  return Math.abs(value - Math.round(value)) < EPSILON;
}

function formatValue(value) {
  if (isNearInteger(value)) {
    return String(Math.round(value));
  }

  return String(Number(value.toFixed(2)));
}

function calculate(left, right, operator) {
  if (operator === "+") {
    return left + right;
  }

  if (operator === "-") {
    return left - right;
  }

  if (operator === "*") {
    return left * right;
  }

  if (operator === "/") {
    if (Math.abs(right) < EPSILON) {
      return null;
    }

    return left / right;
  }

  return null;
}

function operatorLabel(operator) {
  if (operator === "*") {
    return "×";
  }

  if (operator === "/") {
    return "÷";
  }

  return operator;
}

function stripOuterParens(expr) {
  if (!expr || expr[0] !== "(" || expr[expr.length - 1] !== ")") {
    return expr;
  }

  let depth = 0;
  for (let i = 0; i < expr.length; i += 1) {
    if (expr[i] === "(") {
      depth += 1;
    } else if (expr[i] === ")") {
      depth -= 1;
      if (depth === 0 && i !== expr.length - 1) {
        return expr;
      }
    }
  }

  return expr.slice(1, -1);
}

function buildCandidates(left, right) {
  const items = [
    {
      value: left.value + right.value,
      expr: `(${left.expr} + ${right.expr})`,
      step: `${left.expr} + ${right.expr} = ${formatValue(left.value + right.value)}`
    },
    {
      value: left.value * right.value,
      expr: `(${left.expr} × ${right.expr})`,
      step: `${left.expr} × ${right.expr} = ${formatValue(left.value * right.value)}`
    },
    {
      value: left.value - right.value,
      expr: `(${left.expr} - ${right.expr})`,
      step: `${left.expr} - ${right.expr} = ${formatValue(left.value - right.value)}`
    },
    {
      value: right.value - left.value,
      expr: `(${right.expr} - ${left.expr})`,
      step: `${right.expr} - ${left.expr} = ${formatValue(right.value - left.value)}`
    }
  ];

  if (Math.abs(right.value) >= EPSILON) {
    const value = left.value / right.value;
    items.push({
      value,
      expr: `(${left.expr} ÷ ${right.expr})`,
      step: `${left.expr} ÷ ${right.expr} = ${formatValue(value)}`
    });
  }

  if (Math.abs(left.value) >= EPSILON) {
    const value = right.value / left.value;
    items.push({
      value,
      expr: `(${right.expr} ÷ ${left.expr})`,
      step: `${right.expr} ÷ ${left.expr} = ${formatValue(value)}`
    });
  }

  return items;
}

function makeMergedItem(left, right, candidate) {
  const negativeSteps =
    (left.negativeSteps || 0) +
    (right.negativeSteps || 0) +
    (candidate.value < -EPSILON ? 1 : 0);
  const fractionSteps =
    (left.fractionSteps || 0) +
    (right.fractionSteps || 0) +
    (!isNearInteger(candidate.value) ? 1 : 0);

  return {
    value: candidate.value,
    expr: candidate.expr,
    negativeSteps,
    fractionSteps,
    steps: (left.steps || []).concat(right.steps || []).concat(candidate.step)
  };
}

function scoreSolution(item) {
  const parenCount = (item.expr.match(/\(/g) || []).length;

  return (
    item.negativeSteps * 1000 +
    item.fractionSteps * 100 +
    parenCount * 8 +
    item.expr.length
  );
}

function collectSolutions(items) {
  if (items.length === 1) {
    return isTwentyFour(items[0].value) ? [items[0]] : [];
  }

  let solutions = [];

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i];
      const right = items[j];
      const rest = items.filter((_, index) => index !== i && index !== j);
      const candidates = buildCandidates(left, right);

      for (let k = 0; k < candidates.length; k += 1) {
        const merged = makeMergedItem(left, right, candidates[k]);
        solutions = solutions.concat(collectSolutions(rest.concat(merged)));
      }
    }
  }

  return solutions;
}

function itemsFromNumbers(numbers) {
  return numbers.map((value) => ({
    value,
    expr: formatValue(value),
    steps: [],
    negativeSteps: 0,
    fractionSteps: 0
  }));
}

function itemsFromCards(cards) {
  return cards.map((card) => ({
    value: card.value,
    expr: card.rank,
    steps: [],
    negativeSteps: 0,
    fractionSteps: 0
  }));
}

function pickBestSolution(solutions) {
  if (!solutions.length) {
    return null;
  }

  const ranked = solutions
    .slice()
    .sort((left, right) => scoreSolution(left) - scoreSolution(right));

  const best = ranked[0];
  const expr = stripOuterParens(best.expr);

  return {
    expr,
    steps: best.steps || [],
    negativeSteps: best.negativeSteps,
    score: scoreSolution(best)
  };
}

function findBestSolution(numbers, cards) {
  const items = cards ? itemsFromCards(cards) : itemsFromNumbers(numbers);
  const solutions = collectSolutions(items);
  return pickBestSolution(solutions);
}

function normalizeDisplayExpr(expr) {
  let result = expr;

  while (/\(\d+(?:\.\d+)?\)/.test(result)) {
    result = result.replace(/\((\d+(?:\.\d+)?)\)/g, "$1");
  }

  return result;
}

function formatHintSteps(steps) {
  const valueByExpr = {};

  return steps.map((step) => {
    const matched = step.match(/^(.+)\s=\s(-?\d+(?:\.\d+)?)$/);
    if (!matched) {
      return step;
    }

    let left = matched[1];
    const result = matched[2];
    const exprKeys = Object.keys(valueByExpr).sort((a, b) => b.length - a.length);

    exprKeys.forEach((expr) => {
      const value = valueByExpr[expr];
      left = left.split(`(${expr})`).join(value);
      left = left.split(expr).join(value);
    });

    valueByExpr[matched[1]] = result;
    return `${normalizeDisplayExpr(left)} = ${result}`;
  });
}

function formatHintText(hint) {
  if (!hint) {
    return "这题暂时没有提示。";
  }

  if (hint.steps && hint.steps.length) {
    const lines = formatHintSteps(hint.steps).map((step, index) => `${index + 1}. ${step}`);
    return `推荐步骤：\n${lines.join("\n")}\n\n完整式：${hint.expr} = 24`;
  }

  return `${hint.expr} = 24`;
}

function solve24(numbers) {
  const hint = findBestSolution(numbers);
  return hint ? hint.expr : null;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createRandomCard() {
  const rank = randomItem(RANKS);
  const suit = randomItem(SUITS);

  return {
    rank: rank.rank,
    value: rank.value,
    suit: suit.suit,
    color: suit.color
  };
}

function cardsFromValues(values) {
  return values.map((value, index) => {
    const rank = RANKS[value - 1];
    const suit = SUITS[index % SUITS.length];

    return {
      rank: rank.rank,
      value: rank.value,
      suit: suit.suit,
      color: suit.color
    };
  });
}

function generateProblem(maxAttempts) {
  const attempts = maxAttempts || 2000;

  for (let i = 0; i < attempts; i += 1) {
    const cards = [
      createRandomCard(),
      createRandomCard(),
      createRandomCard(),
      createRandomCard()
    ];
    const hint = findBestSolution(
      cards.map((card) => card.value),
      cards
    );

    if (hint) {
      return {
        cards,
        solution: hint.expr,
        hintText: formatHintText(hint)
      };
    }
  }

  const fallbackCards = cardsFromValues([3, 3, 8, 8]);
  const hint = findBestSolution(
    fallbackCards.map((card) => card.value),
    fallbackCards
  );

  return {
    cards: fallbackCards,
    solution: hint ? hint.expr : null,
    hintText: formatHintText(hint)
  };
}

module.exports = {
  TARGET,
  EPSILON,
  calculate,
  findBestSolution,
  formatHintText,
  formatValue,
  generateProblem,
  isTwentyFour,
  operatorLabel,
  solver24: solve24,
  solve24
};
