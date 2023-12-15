// * CLASSES

class ScalingError extends Error {
  constructor(msg) {
    super(msg);
    this.name = "ScalingError";
  }
}

class State {
  static deep = Symbol();
  static water = Symbol();
  static beach = Symbol();
  static grass = Symbol();
  static trees = Symbol();
  static mountain = Symbol();
  static snow = Symbol();

  static getAll() {
    return Array.from(
      State.toString().matchAll(/static (?<a>[a-zA-Z]+) = Symbol\(\);/g)
    ).map((e) => e.groups.a);
  }

  /**
   * @param {symbol} state
   */
  static getColours(state) {
    switch (state) {
      case State.grass:
        return {
          primary: "#3fde67",
          secondary: "#12782b",
        };
      case State.beach:
        return {
          primary: "#ebda7e",
          secondary: "#d7c353",
        };
      case State.water:
        return {
          primary: "#7ebeeb",
          secondary: "#3a50cb",
        };
      case State.trees:
        return {
          primary: "#13a02d",
          secondary: "#014a10",
        };
      case State.mountain:
        return {
          primary: "#888888",
          secondary: "#444444",
        };
      case State.snow:
        return {
          primary: "#FFFFFF",
          secondary: "#CCCCCC",
        };
      case State.deep:
        return {
          primary: "#2a408b",
          secondary: "#1a205b",
        };
      default:
        return {
          primary: "#ef7777",
          secondary: "#852727",
        };
    }
  }

  static all_list = State.getAll();

  /**
   * @param {symbol} state
   */
  static getName(state) {
    for (const name of State.all_list) {
      if (State[name] == state) return name;
    }
    return undefined;
  }
}
Object.freeze(State);

class Constraints {
  static deep = Object.freeze({
    states: [State.deep, State.water],
    weights: [6, 1],
  });
  static water = Object.freeze({
    states: [State.deep, State.water, State.beach],
    weights: [1, 4, 6],
  });
  static beach = Object.freeze({
    states: [State.water, State.beach, State.grass],
    weights: [2, 1, 3],
  });
  static grass = Object.freeze({
    states: [State.mountain, State.beach, State.grass, State.trees],
    weights: [1, 1, 3, 2],
  });
  static trees = Object.freeze({
    states: [State.mountain, State.grass, State.trees],
    weights: [1, 1, 2],
  });
  static mountain = Object.freeze({
    states: [State.snow, State.trees, State.grass, State.mountain],
    weights: [2, 2, 1, 2],
  });
  static snow = Object.freeze({
    states: [State.snow, State.mountain],
    weights: [2, 3],
  });
}
Object.freeze(Constraints);

class Square {
  get entropy() {
    return this.states.length;
  }

  /** @type {symbol[]} */
  states;
  pos;

  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    const allStates = State.all_list;
    this.states = Array.from({ length: allStates.length }, (_, i) => {
      return State[allStates[i]];
    });
    this.pos = { x, y };
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Camera} cam
   */
  draw(context, cam) {
    const squareCount = Math.ceil(Math.sqrt(this.entropy));

    const size = 1 / squareCount;
    for (let i = 0; i < this.states.length; i++) {
      const colours = State.getColours(this.states[i]);

      context.fillStyle = colours.secondary;
      const bigX = this.pos.x + ((i + 0.05) % squareCount) / squareCount;
      const bigY = this.pos.y + (Math.floor(i / squareCount) + 0.05) / squareCount;
      context.fillRect(
        ...cam.reposition(bigX, bigY),
        ...cam.rescale(size * 0.9, size * 0.9)
      );

      context.fillStyle = colours.primary;
      const smallX = this.pos.x + ((i + 0.15) % squareCount) / squareCount;
      const smallY = this.pos.y + (Math.floor(i / squareCount) + 0.15) / squareCount;
      context.fillRect(
        ...cam.reposition(smallX, smallY),
        ...cam.rescale(size * 0.7, size * 0.7)
      );
    }

    context.strokeStyle = "#7a7a20";
    context.lineWidth = cam.scale;
    context.strokeRect(...cam.reposition(this.pos.x, this.pos.y), ...cam.rescale(1, 1));
  }

  /**
   * @param {Object<symbol, number>} unfilteredWeights
   * @returns {CollapedSquare}
   */
  collapse(unfilteredWeights) {
    const filteredWeights = {};
    for (const state of this.states) {
      filteredWeights[state] = 1;
    }
    for (const [key, value] of symbolEntries(unfilteredWeights)) {
      if (this.states.includes(key)) filteredWeights[key] += value;
    }

    return new CollapedSquare(this.pos.x, this.pos.y, weightedRandom(filteredWeights));
  }
}

class CollapedSquare {
  /** @type {symbol} */
  state;
  pos;

  /**
   * @param {number} x
   * @param {number} y
   * @param {symbol} state
   */
  constructor(x, y, state) {
    this.state = state;
    this.pos = { x, y };
  }
  draw(context, cam) {
    const colours = State.getColours(this.state);

    context.fillStyle = colours.secondary;
    context.fillRect(...cam.reposition(this.pos.x, this.pos.y), ...cam.rescale(1, 1));

    context.fillStyle = colours.primary;
    context.fillRect(
      ...cam.reposition(this.pos.x + 0.1111111111, this.pos.y + 0.1111111111),
      ...cam.rescale(0.7777777778, 0.7777777778)
    );
  }
}

class Grid {
  /** @type {Square[][]} */
  grid;

  get pxWidth() {
    return this.width * camera.scale * 64;
  }

  get pxHeight() {
    return this.height * camera.scale * 64;
  }

  get width() {
    return this.#width;
  }
  set width(val) {
    if (!Number.isInteger(val) || val <= 0)
      throw new ScalingError("Must be an unsigned integer");
    this.#width = val;
    this.#resize();
  }

  get height() {
    return this.#height;
  }
  set height(val) {
    if (!Number.isInteger(val)) throw new ScalingError("Must be an integer");
    this.#height = val;
    this.#resize();
  }

  #width;
  #height;

  /**
   *
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    this.grid = Array.from({ length: width }, (_, x) =>
      Array.from({ length: height }, (_, y) => new Square(x, y))
    );
    this.width = width;
    this.height = height;
  }

  /**
   * @param {CanvasRenderingContext2D} context
   * @param {Camera} cam
   */
  draw(context, cam) {
    context.strokeStyle = "#77ef95";
    const line_width = cam.scale * 8;
    context.lineWidth = line_width;
    context.lineJoin = "bevel";
    context.fillStyle = "#ffffff";

    const [x, y] = cam.reposition(0, 0);
    const width = this.pxWidth + line_width;
    const height = this.pxHeight + line_width;

    context.beginPath();
    context.rect(x - line_width / 2, y - line_width / 2, width, height);

    context.save();
    context.globalCompositeOperation = "difference";
    context.fill();
    context.restore();

    context.stroke();

    for (const line of this.grid) {
      for (const sqr of line) {
        sqr.draw(context, cam);
      }
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  get(x, y) {
    try {
      return this.grid[x][y];
    } catch (error) {
      return undefined;
    }
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {Square|CollapedSquare} val
   */
  set(x, y, val) {
    this.grid[x][y] = val;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @returns {(Square|CollapedSquare|undefined)[]}
   */
  getNeighbours(x, y) {
    const result = [];
    result.push(this.get(x + 1, y));
    result.push(this.get(x - 1, y));
    result.push(this.get(x, y + 1));
    result.push(this.get(x, y - 1));
    return result;
  }

  #resize() {
    this.grid = Array.from({ length: this.width }, (_, x) =>
      Array.from({ length: this.height }, (_, y) => new Square(x, y))
    );
  }
}

class Camera {
  get scale() {
    return this.#scale;
  }
  set scale(val) {
    if (val <= 0) throw new RangeError("Must be greater than 0");
    this.#scale = val;
  }

  get x() {
    const bound = this.#grid.width / 2;
    return clamp(this.#pos.x, -bound, bound);
  }
  set x(val) {
    this.#pos.x = val;
  }

  get y() {
    const bound = this.#grid.height / 2;
    return clamp(this.#pos.y, -bound, bound);
  }
  set y(val) {
    this.#pos.y = val;
  }

  #scale;

  #canvas;

  #grid;

  #pos;

  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Grid} grid
   */
  constructor(canvas, grid) {
    this.#pos = { x: 0, y: 0 };
    this.scale = 1;
    this.#canvas = canvas;
    this.#grid = grid;
  }

  /**
   * @param  {number} x
   * @param  {number} y
   */
  reposition(x, y) {
    const scale = this.scale * 64;
    const scaled = [];

    scaled.push(
      this.#canvas.width / 2 - this.x * scale - 0.5 * scale * this.#grid.width + x * scale
    );
    scaled.push(
      this.#canvas.height / 2 -
        this.y * scale -
        0.5 * scale * this.#grid.height +
        y * scale
    );

    return scaled;
  }

  /**
   * @param {number} x
   * @param {number} y
   */
  unposition(x, y) {
    const scale = this.scale * 64;
    const unscaled = [];

    unscaled.push(
      (x - this.#canvas.width / 2 + this.x * scale + 0.5 * scale * this.#grid.width) /
        scale
    );
    unscaled.push(
      (y - this.#canvas.height / 2 + this.y * scale + 0.5 * scale * this.#grid.height) /
        scale
    );

    return unscaled;
  }

  /**
   * @param  {number} width
   * @param  {number} height
   */
  rescale(width, height) {
    const scale = this.scale * 64;
    const scaled = [];

    scaled.push(width * scale);
    scaled.push(height * scale);

    return scaled;
  }
}

class WaveFunctionCollapse {
  #grid;

  /**
   * @param {Grid} grid
   */
  constructor(grid) {
    this.#grid = grid;
  }

  /**
   * @param {NodeListOf} inputs
   * @param {number} [depth=0]
   */
  async generate(inputs, depth = 0) {
    inputs.forEach((el) => (el.disabled = true));
    this.step();
    if (this.canStep()) {
      if (depth == 0) await sleep(1);
      this.generate(inputs, (depth + 1) % 5);
    } else {
      inputs.forEach((el) => (el.disabled = false));
    }
  }

  step() {
    // Check if valid
    if (!this.canStep()) return;

    // Find set of lowest entropy
    /** @type {Set<Square>} */
    const lowestEntropySet = new Set();
    for (const line of this.#grid.grid) {
      for (const square of line) {
        if (square instanceof CollapedSquare) continue;

        const [first] = lowestEntropySet;
        if (typeof first == "undefined") {
          lowestEntropySet.add(square);
          continue;
        }

        if (square.entropy < first.entropy) {
          lowestEntropySet.clear();
          lowestEntropySet.add(square);
          continue;
        }

        if (square.entropy == first.entropy) {
          lowestEntropySet.add(square);
          continue;
        }
      }
    }

    // Collapse random square from set with weights
    const randPos =
      Array.from(lowestEntropySet)[Math.floor(Math.random() * lowestEntropySet.size)].pos;
    const weights = this.#grid
      .getNeighbours(randPos.x, randPos.y)
      .filter((sqr) => sqr instanceof CollapedSquare)
      .map((sqr) => {
        /** @type {Object<symbol, number>} */
        const weightObj = {};
        const constraints = Constraints[State.getName(sqr.state)];
        for (let i = 0; i < constraints.states.length; i++) {
          weightObj[constraints.states[i]] = constraints.weights[i];
        }
        return weightObj;
      })
      .reduce((prev, curr) => {
        for (const [key, value] of symbolEntries(curr)) {
          if (Object.hasOwn(prev, key)) {
            prev[key] += value;
          } else {
            prev[key] = value;
          }
        }
        return prev;
      }, {});
    const collapsedSquare = this.#grid.get(randPos.x, randPos.y).collapse(weights);
    this.#grid.set(randPos.x, randPos.y, collapsedSquare);

    // Set filters
    const filter = new Filter(Constraints[State.getName(collapsedSquare.state)].states);
    /** @type {Object<string, Filter[]>} */
    const filterList = new Object();

    this.#setFilters(randPos.x + 1, randPos.y, filter, filterList);
    this.#setFilters(randPos.x - 1, randPos.y, filter, filterList);
    this.#setFilters(randPos.x, randPos.y + 1, filter, filterList);
    this.#setFilters(randPos.x, randPos.y - 1, filter, filterList);

    // Propagate filters across all cells
    this.#propagateFilter(filterList);
  }

  canStep() {
    let valid = false;
    for (const line of this.#grid.grid) {
      for (const square of line) {
        if (square instanceof Square) {
          valid = true;
          break;
        }
      }
      if (valid) break;
    }
    return valid;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {Filter} filter
   * @param {Object<string, Filter[]>} filterList
   * @param {Array<Square>} completed
   */
  #setFilters(x, y, filter, filterList, completed = new Array()) {
    if (filter.hasAll) return;

    const square = this.#grid.get(x, y);
    if (!(square instanceof Square)) return;
    if (completed.includes(square)) return;

    if (new Filter(square.states).equals(filter)) return;
    completed.push(square);

    const states = [...square.states];
    filter.filter(states);

    const posString = JSON.stringify(square.pos);
    if (!Object.hasOwn(filterList, posString)) filterList[posString] = new Array();
    filterList[posString].push(new Filter(states));

    const filterSet = [];
    for (const state of states) {
      const name = State.getName(state);
      filterSet.push(Constraints[name].states);
    }
    const newFilter = Filter.filter_union(filterSet);

    this.#setFilters(x + 1, y, newFilter, filterList, [...completed]);
    this.#setFilters(x - 1, y, newFilter, filterList, [...completed]);
    this.#setFilters(x, y + 1, newFilter, filterList, [...completed]);
    this.#setFilters(x, y - 1, newFilter, filterList, [...completed]);
  }

  /**
   * @param {Object<string, Filter[]>} filterList
   */
  #propagateFilter(filterList) {
    for (const [key, value] of Object.entries(filterList)) {
      /** @type {{x:number, y:number}} */
      const pos = JSON.parse(key);
      const combined = Filter.combine(value);

      combined.filter(this.#grid.get(pos.x, pos.y).states);
    }
  }

  reset() {
    this.#grid.grid = Array.from({ length: this.#grid.width }, (_, x) =>
      Array.from({ length: this.#grid.height }, (_, y) => new Square(x, y))
    );
  }
}

class Filter {
  /**
   * @param {symbol[][]} constraints
   */
  static filter_union(constraints) {
    return new Filter([...new Set([].concat(...constraints))]);
  }

  /**
   * @param  {Filter[]} filters
   */
  static combine(filters) {
    /** @type {Set<symbol>} */
    const result = new Set();

    for (const [i, filter] of filters.entries()) {
      if (i == 0) {
        for (const constraint of filter) {
          result.add(constraint);
        }
        continue;
      }
      result.forEach((constraint) => {
        if (!filter.includes(constraint)) result.delete(constraint);
      });
    }
    return new Filter(Array.from(result));
  }

  static #allConstraints = Object.freeze(
    Array.from(Constraints.toString().match(/static [a-zA-Z]+ = Object\.freeze\(.*$/gm))
  );

  #constraints;

  /**
   * @param {symbol[]} constraints
   */
  constructor(constraints) {
    this.#constraints = constraints;
  }

  /**
   * @param {Filter} filter
   */
  equals(filter) {
    if (this.size !== filter.size) return false;
    for (const constraint of filter) {
      if (!this.includes(constraint)) return false;
    }
    return true;
  }

  /**
   * @param {symbol} constraint
   */
  includes(constraint) {
    return this.#constraints.includes(constraint);
  }

  /**
   * @param {symbol[]} stateList
   */
  filter(stateList) {
    for (let i = stateList.length - 1; i >= 0; i--) {
      const state = stateList[i];
      if (!this.includes(state)) stateList.splice(i, 1);
    }
  }

  [Symbol.iterator]() {
    let index = -1;
    let data = this.#constraints;

    return {
      next: () => ({ value: data[++index], done: !(index in data) }),
    };
  }

  get size() {
    return this.#constraints.length;
  }

  get hasAll() {
    return this.#constraints.length == Filter.#allConstraints.length;
  }
}

class StateBitmask {
  #bitmask;

  /**
   * @param {symbol[]} stateList
   */
  constructor(stateList) {
    this.#bitmask = {};
    for (let i = 0; i < stateList.length; i++) {
      this.#bitmask[stateList[i]] = 2 ** i;
    }
  }

  /**
   * @param {symbol[]} stateList
   */
  find(stateList) {
    return stateList.reduce((prev, curr) => {
      return prev + this.#bitmask[curr];
    }, 0);
  }
}

class DrawnStateCache {
  #canvas;
  constructor(maxSize) {
    this.#canvas = new OffscreenCanvas(maxSize, maxSize);
  }
}

// * SETUP AND RUN

/** @type {HTMLCanvasElement} */
const cnv = document.getElementById("cnv");
/** @type {CanvasRenderingContext2D} */
const ctx = cnv.getContext("2d");
setCanvasScale();

const grid = new Grid(10, 10);
const camera = new Camera(cnv, grid);
const wfc = new WaveFunctionCollapse(grid);
const bitmask = new StateBitmask(State.all_list.map((s) => State[s]));
const cache = new DrawnStateCache(396.271131);

function draw(frame) {
  ctx.clearRect(0, 0, cnv.width, cnv.height);

  drawBackground(ctx, frame);

  grid.draw(ctx, camera);
  requestAnimationFrame(draw.bind(globalThis, frame + 1));
}

requestAnimationFrame(draw.bind(0));

// * EVENT LISTENERS

window.addEventListener("resize", setCanvasScale);

function setCanvasScale() {
  cnv.height = Math.floor(window.innerHeight * window.devicePixelRatio);
  cnv.width = Math.floor(window.innerWidth * window.devicePixelRatio);
}

document
  .querySelectorAll("#grid input[name]")
  .forEach((node) => node.addEventListener("input", handleInput));
/**
 * @param {Object} param0
 * @param {HTMLInputElement} param0.target
 */
function handleInput({ target }) {
  const value = Number(target.value).toFixed(0);
  target.value = value <= 0 ? 1 : value;

  switch (target.name) {
    case "width": {
      grid.width = Number(target.value);
      break;
    }
    case "height": {
      grid.height = Number(target.value);
      break;
    }
  }
}

document
  .querySelectorAll("drag-box button[name]")
  .forEach((node) => node.addEventListener("click", handleBtnClick));
/**
 * @param {PointerEvent} event
 */
function handleBtnClick(event) {
  switch (event.target.name) {
    case "generate": {
      if (!wfc.canStep()) wfc.reset();
      wfc.generate(document.querySelectorAll("drag-box [name]"), 1);
      break;
    }
    case "step": {
      wfc.step();
      break;
    }
    case "reset": {
      wfc.reset();
      break;
    }
  }
}

cnv.addEventListener("wheel", handleScroll);
/**
 * @param {WheelEvent} event
 */
function handleScroll({ deltaY }) {
  camera.scale = clamp(camera.scale * 1.2 ** -Math.sign(deltaY), 1.2 ** -10, 1.2 ** 10);
}

cnv.addEventListener("mousedown", handleCnvClick);
/**
 * @param {MouseEvent} event
 */
function handleCnvClick({ button, clientX, clientY }) {
  if (button == 1 || button == 2) {
    const vals = [cnv.width, cnv.height, camera.x, camera.y, grid.width, grid.height];
    const offset = unposition(
      clientX * window.devicePixelRatio,
      clientY * window.devicePixelRatio,
      ...vals
    );

    const camX = camera.x;
    const camY = camera.y;

    const fn = (event) => {
      dragBox(event, offset, camX, camY, vals);
    };
    const stopFn = ({ button }) => {
      if (button == 1 || button == 2) {
        stopDrag.apply(globalThis, [fn]);
      } else {
        document.addEventListener("mouseup", stopFn, { once: true });
      }
    };
    document.addEventListener("mouseup", stopFn, { once: true });
    document.addEventListener("mousemove", fn);
  }

  function stopDrag(fn) {
    document.removeEventListener("mousemove", fn);
  }

  function dragBox(event, offset, camX, camY, vals) {
    const client = unposition(
      event.clientX * window.devicePixelRatio,
      event.clientY * window.devicePixelRatio,
      ...vals
    );

    const x = camX + offset[0] - client[0];
    const y = camY + offset[1] - client[1];

    camera.x = x;
    camera.y = y;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} cnvWidth
   * @param {number} cnvHeight
   * @param {number} camX
   * @param {number} camY
   * @param {number} gridHeight
   * @param {number} gridWidth
   */
  function unposition(x, y, cnvWidth, cnvHeight, camX, camY, gridWidth, gridHeight) {
    const scale = camera.scale * 64;
    const unscaled = [];

    unscaled.push((x - cnvWidth / 2 + camX * scale + 0.5 * scale * gridWidth) / scale);
    unscaled.push((y - cnvHeight / 2 + camY * scale + 0.5 * scale * gridHeight) / scale);

    return unscaled;
  }
}

cnv.addEventListener("contextmenu", (event) => event.preventDefault());

// * OTHER FUNCTIONS

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * @template T
 * @param {Object<symbol, T>} obj
 * @returns {T[]}
 */
function symbolValues(obj) {
  return Object.getOwnPropertySymbols(obj).map((s) => obj[s]);
}

/**
 * @template T
 * @param {Object<symbol, T>} obj
 * @returns {[symbol, T][]}
 */
function symbolEntries(obj) {
  return Object.getOwnPropertySymbols(obj).map((s) => [s, obj[s]]);
}

/**
 * @param {Object<symbol, number>} weights
 * @returns {symbol}
 */
function weightedRandom(weights) {
  const max = symbolValues(weights).reduce((p, c) => p + c, 0);
  let rand = Math.random() * max;

  for (const [k, v] of symbolEntries(weights)) {
    rand -= v;
    if (rand < 0) return k;
  }
}

/**
 * @param {CanvasRenderingContext2D} context
 * @param {number} frame
 */
function drawBackground(context, frame) {
  const basis = 100 - ((frame / 8) % 100);

  context.fillStyle = "#010141";

  context.fillRect(0, 0, context.canvas.width, context.canvas.height);

  context.fillStyle = "#0f0f4f";

  context.beginPath();
  for (let i = 0; i < (cnv.width + cnv.height) / 100 + 1; i++) {
    context.moveTo(basis + i * 100, 0);
    context.lineTo(0, basis + i * 100);
    context.lineTo(0, basis - 50 + i * 100);
    context.lineTo(basis - 50 + i * 100, 0);
  }
  context.closePath();
  context.fill();
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((r, _) => {
    setTimeout(r, ms);
  });
}
