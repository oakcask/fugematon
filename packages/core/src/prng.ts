const UINT32_RANGE = 0x1_0000_0000;

export type WeightedChoice<T> = {
  value: T;
  weight: number;
};

export class Xoshiro128StarStar {
  #s0: number;
  #s1: number;
  #s2: number;
  #s3: number;

  constructor(state: readonly [number, number, number, number]) {
    const [s0, s1, s2, s3] = state.map((part) => part >>> 0) as [
      number,
      number,
      number,
      number,
    ];

    if ((s0 | s1 | s2 | s3) === 0) {
      throw new Error("xoshiro128** state must not be all zero");
    }

    this.#s0 = s0;
    this.#s1 = s1;
    this.#s2 = s2;
    this.#s3 = s3;
  }

  static fromSeed(seed: string): Xoshiro128StarStar {
    return new Xoshiro128StarStar(seedToUint32State(seed));
  }

  nextUint32(): number {
    // Blackman and Vigna, xoshiro128** 1.1: rotl(s[1] * 5, 7) * 9.
    const result = Math.imul(rotl32(Math.imul(this.#s1, 5) >>> 0, 7), 9) >>> 0;
    const t = (this.#s1 << 9) >>> 0;

    this.#s2 = (this.#s2 ^ this.#s0) >>> 0;
    this.#s3 = (this.#s3 ^ this.#s1) >>> 0;
    this.#s1 = (this.#s1 ^ this.#s2) >>> 0;
    this.#s0 = (this.#s0 ^ this.#s3) >>> 0;
    this.#s2 = (this.#s2 ^ t) >>> 0;
    this.#s3 = rotl32(this.#s3, 11);

    return result;
  }

  nextFloat(): number {
    return this.nextUint32() / UINT32_RANGE;
  }

  nextInt(maxExclusive: number): number {
    assertPositiveInteger(maxExclusive, "maxExclusive");
    return Math.floor(this.nextFloat() * maxExclusive);
  }

  nextIntRange(minInclusive: number, maxInclusive: number): number {
    assertInteger(minInclusive, "minInclusive");
    assertInteger(maxInclusive, "maxInclusive");

    if (maxInclusive < minInclusive) {
      throw new Error("maxInclusive must be greater than or equal to minInclusive");
    }

    return minInclusive + this.nextInt(maxInclusive - minInclusive + 1);
  }

  chooseWeighted<T>(choices: readonly WeightedChoice<T>[]): T {
    if (choices.length === 0) {
      throw new Error("choices must not be empty");
    }

    const total = choices.reduce((sum, choice) => {
      if (!Number.isFinite(choice.weight) || choice.weight <= 0) {
        throw new Error("choice weights must be finite positive numbers");
      }

      return sum + choice.weight;
    }, 0);

    let point = this.nextFloat() * total;
    for (const choice of choices) {
      point -= choice.weight;
      if (point < 0) {
        return choice.value;
      }
    }

    return choices[choices.length - 1]!.value;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }

    return shuffled;
  }

  snapshot(): [number, number, number, number] {
    return [this.#s0, this.#s1, this.#s2, this.#s3];
  }
}

export function seedToUint32State(seed: string): [number, number, number, number] {
  const state: [number, number, number, number] = [
    0x811c9dc5,
    0x9e3779b9,
    0x85ebca6b,
    0xc2b2ae35,
  ];

  const normalized = seed.length === 0 ? "\0" : seed;
  for (let i = 0; i < normalized.length; i += 1) {
    const code = normalized.charCodeAt(i);
    mixCodeUnit(state, code & 0xff, i);
    mixCodeUnit(state, code >>> 8, i + 0x9e37);
  }

  for (let i = 0; i < state.length; i += 1) {
    state[i] = avalanche32(state[i]! ^ Math.imul(normalized.length + i, 0x9e3779b1));
  }

  if ((state[0] | state[1] | state[2] | state[3]) === 0) {
    state[0] = 0x6d2b79f5;
  }

  return state;
}

function mixCodeUnit(state: [number, number, number, number], byte: number, index: number): void {
  const lane = index & 3;
  state[lane] ^= byte;
  state[lane] = Math.imul(state[lane], 0x01000193) >>> 0;
  state[lane] = rotl32(state[lane], (index % 23) + 5);
}

function avalanche32(value: number): number {
  value >>>= 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d) >>> 0;
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b) >>> 0;
  value ^= value >>> 16;
  return value >>> 0;
}

function rotl32(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function assertPositiveInteger(value: number, name: string): void {
  assertInteger(value, name);
  if (value <= 0) {
    throw new Error(`${name} must be positive`);
  }
}

function assertInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer`);
  }
}
