/**
 * @jest-environment jsdom
 */
import { SpreadsheetForm } from '../spreadsheetForm.js';

describe('SpreadsheetForm', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('renders a form with six text inputs', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs).toHaveLength(6);
  });

  test('uses default field labels when none are provided', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    const headers = container.querySelectorAll('thead th');
    expect(headers).toHaveLength(6);
    expect(Array.from(headers).map((th) => th.textContent)).toEqual([
      'Field 1',
      'Field 2',
      'Field 3',
      'Field 4',
      'Field 5',
      'Field 6',
    ]);
  });

  test('uses custom labels when provided', () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const form = new SpreadsheetForm({ labels });
    form.render(container);

    const headers = container.querySelectorAll('thead th');
    expect(Array.from(headers).map((th) => th.textContent)).toEqual(labels);
  });

  test('falls back to defaults when labels are not exactly six', () => {
    const form = new SpreadsheetForm({ labels: ['A', 'B'] });
    form.render(container);

    const headers = container.querySelectorAll('thead th');
    expect(headers).toHaveLength(6);
    expect(headers[0].textContent).toBe('Field 1');
  });

  test('renders the spreadsheet table with no data rows initially', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    const bodyRows = container.querySelectorAll('tbody tr');
    expect(bodyRows).toHaveLength(0);
  });

  test('submitting the form appends a new row with the input values', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    const inputs = container.querySelectorAll('input[type="text"]');
    const values = ['one', 'two', 'three', 'four', 'five', 'six'];
    inputs.forEach((input, index) => {
      input.value = values[index];
    });

    const formEl = container.querySelector('form');
    formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const cells = container.querySelectorAll('tbody tr td');
    expect(cells).toHaveLength(6);
    expect(Array.from(cells).map((td) => td.textContent)).toEqual(values);
  });

  test('inputs are cleared after submission', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    const inputs = container.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => { input.value = 'x'; });

    container.querySelector('form').dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );

    inputs.forEach((input) => {
      expect(input.value).toBe('');
    });
  });

  test('calls onSubmit callback with the submitted values', () => {
    const onSubmit = jest.fn();
    const form = new SpreadsheetForm({ onSubmit });
    form.render(container);

    const inputs = container.querySelectorAll('input[type="text"]');
    const values = ['a', 'b', 'c', 'd', 'e', 'f'];
    inputs.forEach((input, index) => {
      input.value = values[index];
    });

    container.querySelector('form').dispatchEvent(
      new Event('submit', { cancelable: true, bubbles: true }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(values);
  });

  test('getRows returns all rows that have been added', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    form.addRow(['1', '2', '3', '4', '5', '6']);
    form.addRow(['7', '8', '9', '10', '11', '12']);

    expect(form.getRows()).toEqual([
      ['1', '2', '3', '4', '5', '6'],
      ['7', '8', '9', '10', '11', '12'],
    ]);
  });

  test('addRow throws when values length is not six', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    expect(() => form.addRow(['only', 'two'])).toThrow('addRow requires exactly 6 values');
  });

  test('toCSV serializes headers and rows and escapes special characters', () => {
    const form = new SpreadsheetForm({
      labels: ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'],
    });
    form.render(container);

    form.addRow(['a', 'b,c', 'd"e', 'f', 'g', 'h']);

    const csv = form.toCSV();
    expect(csv).toBe('H1,H2,H3,H4,H5,H6\na,"b,c","d""e",f,g,h');
  });

  test('throws when rendering without a container', () => {
    const form = new SpreadsheetForm();
    expect(() => form.render(null)).toThrow('Container element is required');
  });

  test('destroy removes the form from the DOM', () => {
    const form = new SpreadsheetForm();
    form.render(container);

    expect(container.querySelector('[data-testid="spreadsheet-form"]')).not.toBeNull();

    form.destroy();

    expect(container.querySelector('[data-testid="spreadsheet-form"]')).toBeNull();
  });

  test('destroy handles an un-rendered form gracefully', () => {
    const form = new SpreadsheetForm();
    expect(() => form.destroy()).not.toThrow();
  });
});
