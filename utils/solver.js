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

function formatValue(value) {
  if (Math.abs(value - Math.round(value)) < EPSILON) {
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

function buildCandidates(left, right) {
  const items = [
    {
      value: left.value + right.value,
      expr: `(${left.expr} + ${right.expr})`
    },
    {
      value: left.value * right.value,
      expr: `(${left.expr} × ${right.expr})`
    },
    {
      value: left.value - right.value,
      expr: `(${left.expr} - ${right.expr})`
    },
    {
      value: right.value - left.value,
      expr: `(${right.expr} - ${left.expr})`
    }
  ];

  if (Math.abs(right.value) >= EPSILON) {
    items.push({
      value: left.value / right.value,
      expr: `(${left.expr} ÷ ${right.expr})`
    });
  }

  if (Math.abs(left.value) >= EPSILON) {
    items.push({
      value: right.value / left.value,
      expr: `(${right.expr} ÷ ${left.expr})`
    });
  }

  return items;
}

function memoKey(items) {
  return items
    .map((item) => Number(item.value.toFixed(6)))
    .sort((left, right) => left - right)
    .join(",");
}

function search(items, memo) {
  if (items.length === 1) {
    return isTwentyFour(items[0].value) ? items[0].expr : null;
  }

  const key = memoKey(items);
  if (memo.has(key)) {
    return null;
  }
  memo.add(key);

  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const left = items[i];
      const right = items[j];
      const rest = items.filter((_, index) => index !== i && index !== j);
      const candidates = buildCandidates(left, right);

      for (let k = 0; k < candidates.length; k += 1) {
        const candidate = candidates[k];
        const solution = search(rest.concat(candidate), memo);

        if (solution) {
          return solution;
        }
      }
    }
  }

  return null;
}

function solve24(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 4) {
    return null;
  }

  const items = numbers.map((value) => ({
    value,
    expr: formatValue(value)
  }));

  return search(items, new Set());
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
    const solution = solve24(cards.map((card) => card.value));

    if (solution) {
      return { cards, solution };
    }
  }

  const fallbackCards = cardsFromValues([3, 3, 8, 8]);
  return {
    cards: fallbackCards,
    solution: solve24(fallbackCards.map((card) => card.value))
  };
}

module.exports = {
  TARGET,
  EPSILON,
  calculate,
  formatValue,
  generateProblem,
  isTwentyFour,
  operatorLabel,
  solve24
};
