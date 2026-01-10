/**
 * @jest-environment jsdom
 */
import { FeedbackButton } from '../feedbackButton.js';

describe('FeedbackButton', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('creates a button with default text', () => {
    const feedbackButton = new FeedbackButton();
    const button = feedbackButton.create();

    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.textContent).toBe('Give Feedback');
  });

  test('creates a button with custom text', () => {
    const feedbackButton = new FeedbackButton({ text: 'Send Feedback' });
    const button = feedbackButton.create();

    expect(button.textContent).toBe('Send Feedback');
  });

  test('button has correct CSS class', () => {
    const feedbackButton = new FeedbackButton();
    const button = feedbackButton.create();

    expect(button.className).toBe('feedback-button');
  });

  test('button has data-testid attribute', () => {
    const feedbackButton = new FeedbackButton();
    const button = feedbackButton.create();

    expect(button.getAttribute('data-testid')).toBe('feedback-button');
  });

  test('renders button to container', () => {
    const feedbackButton = new FeedbackButton();
    feedbackButton.render(container);

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button.textContent).toBe('Give Feedback');
  });

  test('throws error when rendering without container', () => {
    const feedbackButton = new FeedbackButton();

    expect(() => feedbackButton.render(null)).toThrow('Container element is required');
  });

  test('calls custom onClick handler when clicked', () => {
    const mockClickHandler = jest.fn();
    const feedbackButton = new FeedbackButton({ onClick: mockClickHandler });
    const button = feedbackButton.create();

    button.click();

    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });

  test('calls default click handler when no custom handler provided', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const feedbackButton = new FeedbackButton();
    const button = feedbackButton.create();

    button.click();

    expect(consoleSpy).toHaveBeenCalledWith('Feedback button clicked');
    consoleSpy.mockRestore();
  });

  test('getText returns current button text', () => {
    const feedbackButton = new FeedbackButton({ text: 'Custom Text' });

    expect(feedbackButton.getText()).toBe('Custom Text');
  });

  test('setText updates button text', () => {
    const feedbackButton = new FeedbackButton();
    const button = feedbackButton.create();

    feedbackButton.setText('New Text');

    expect(feedbackButton.getText()).toBe('New Text');
    expect(button.textContent).toBe('New Text');
  });

  test('destroy removes button from DOM', () => {
    const feedbackButton = new FeedbackButton();
    feedbackButton.render(container);

    expect(container.querySelector('button')).not.toBeNull();

    feedbackButton.destroy();

    expect(container.querySelector('button')).toBeNull();
  });

  test('destroy handles button not in DOM gracefully', () => {
    const feedbackButton = new FeedbackButton();

    expect(() => feedbackButton.destroy()).not.toThrow();
  });
});
