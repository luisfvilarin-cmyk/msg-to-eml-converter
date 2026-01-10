/**
 * FeedbackButton class
 * Creates and manages a feedback button component
 */
export class FeedbackButton {
  constructor(options = {}) {
    this.text = options.text || 'Give Feedback';
    this.onClick = options.onClick || this.defaultClickHandler;
    this.button = null;
  }

  /**
   * Default click handler that logs feedback action
   */
  defaultClickHandler() {
    console.log('Feedback button clicked');
  }

  /**
   * Creates and returns the button element
   * @returns {HTMLButtonElement} The created button element
   */
  create() {
    this.button = document.createElement('button');
    this.button.textContent = this.text;
    this.button.className = 'feedback-button';
    this.button.setAttribute('data-testid', 'feedback-button');
    this.button.addEventListener('click', () => this.onClick());
    return this.button;
  }

  /**
   * Renders the button to a container element
   * @param {HTMLElement} container - The container to append the button to
   */
  render(container) {
    if (!container) {
      throw new Error('Container element is required');
    }
    const button = this.create();
    container.appendChild(button);
  }

  /**
   * Removes the button from the DOM
   */
  destroy() {
    if (this.button && this.button.parentNode) {
      this.button.parentNode.removeChild(this.button);
    }
  }

  /**
   * Gets the current button text
   * @returns {string} The button text
   */
  getText() {
    return this.text;
  }

  /**
   * Updates the button text
   * @param {string} newText - The new text for the button
   */
  setText(newText) {
    this.text = newText;
    if (this.button) {
      this.button.textContent = newText;
    }
  }
}
