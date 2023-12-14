import { html, css } from "../util.js";

export default class DragBoxElement extends HTMLElement {
  static #htmlElement = document.querySelector("html");

  static #shadowTemplate = html`<template>
    <slot name="header" id="header">Header</slot>
    <slot></slot>
  </template>`;

  static #shadowStyle = css`
    :host {
      position: absolute;
      display: flex;
      top: 0;
      left: 0;
      background-color: aliceblue;
      border: 3px #6495edaa solid;
      box-sizing: border-box;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 300px;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      background: #112233;
    }

    :host slot#header {
      background-color: cornflowerblue;
      width: 100%;
      padding: 10px 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: aliceblue;
      cursor: all-scroll;
    }

    :host slot::slotted(h2) {
      margin: 0;
    }

    :host slot::slotted(div) {
      color: aliceblue;
    }
  `;

  #shadowRoot;

  constructor() {
    super();

    this.#shadowRoot = this.attachShadow({ mode: "closed", slotAssignment: "named" });
    this.#shadowRoot.adoptedStyleSheets = [DragBoxElement.#shadowStyle];
    this.#shadowRoot.append(
      document.importNode(DragBoxElement.#shadowTemplate.content, true)
    );
  }

  connectedCallback() {
    this.#shadowRoot
      .querySelector("slot#header")
      .addEventListener("mousedown", this.#startDrag.bind(this));
    window.addEventListener("resize", this.#resizeCatch.bind(this));
  }

  /**
   * @param {MouseEvent} event
   */
  #startDrag(event) {
    const offset = {
      x: this.offsetLeft - event.clientX,
      y: this.offsetTop - event.clientY,
    };
    const fn = (event) => {
      this.#dragBox(event, offset);
    };
    document.addEventListener("mouseup", this.#stopDrag.bind(this, fn), { once: true });
    document.addEventListener("mousemove", fn);
  }

  #stopDrag(fn) {
    document.removeEventListener("mousemove", fn);
  }

  /**
   * @param {MouseEvent} event
   * @param {{x:number, y:number}} offset
   */
  #dragBox(event, offset) {
    let x = event.clientX + offset.x;
    let y = event.clientY + offset.y;

    const bounds = this.getBoundingClientRect();

    if (x < 0) x = 0;
    if (bounds.width + x > DragBoxElement.#htmlElement.clientWidth)
      x = DragBoxElement.#htmlElement.clientWidth - bounds.width;

    if (y < 0) y = 0;
    if (bounds.height + y > DragBoxElement.#htmlElement.clientHeight)
      y = DragBoxElement.#htmlElement.clientHeight - bounds.height;

    this.style.left = x + "px";
    this.style.top = y + "px";
  }

  #resizeCatch() {
    const bounds = this.getBoundingClientRect();

    let x = bounds.left;
    let y = bounds.top;

    if (x < 0) x = 0;
    if (bounds.width + x > DragBoxElement.#htmlElement.clientWidth)
      x = DragBoxElement.#htmlElement.clientWidth - bounds.width;

    if (y < 0) y = 0;
    if (bounds.height + y > DragBoxElement.#htmlElement.clientHeight)
      y = DragBoxElement.#htmlElement.clientHeight - bounds.height;

    this.style.left = x + "px";
    this.style.top = y + "px";
  }
}

customElements.define("drag-box", DragBoxElement);
