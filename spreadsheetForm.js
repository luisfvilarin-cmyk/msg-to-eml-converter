import * as XLSX from 'xlsx';

/**
 * SpreadsheetForm class
 * Creates a form with 6 text inputs that populates an in-page spreadsheet
 * (HTML table) with each submission. Supports exporting the collected
 * rows to an .xlsx file.
 */
export class SpreadsheetForm {
  constructor(options = {}) {
    const defaultLabels = [
      'Field 1',
      'Field 2',
      'Field 3',
      'Field 4',
      'Field 5',
      'Field 6',
    ];

    this.labels = Array.isArray(options.labels) && options.labels.length === 6
      ? options.labels.slice()
      : defaultLabels;
    this.onSubmit = typeof options.onSubmit === 'function' ? options.onSubmit : null;
    this.sheetName = options.sheetName || 'Sheet1';
    this.filename = options.filename || 'spreadsheet.xlsx';

    this.wrapper = null;
    this.form = null;
    this.inputs = [];
    this.table = null;
    this.tbody = null;
    this.downloadButton = null;
    this.rows = [];
  }

  /**
   * Creates the form, spreadsheet table, and wraps them in a container.
   * @returns {HTMLDivElement} The wrapping element.
   */
  create() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'spreadsheet-form';
    this.wrapper.setAttribute('data-testid', 'spreadsheet-form');

    this.wrapper.appendChild(this.createForm());
    this.wrapper.appendChild(this.createTable());
    this.wrapper.appendChild(this.createDownloadButton());

    return this.wrapper;
  }

  /**
   * Builds the "Download XLSX" button that triggers an .xlsx export.
   * @returns {HTMLButtonElement}
   */
  createDownloadButton() {
    this.downloadButton = document.createElement('button');
    this.downloadButton.type = 'button';
    this.downloadButton.textContent = 'Download XLSX';
    this.downloadButton.className = 'spreadsheet-form__download';
    this.downloadButton.setAttribute('data-testid', 'spreadsheet-form-download');
    this.downloadButton.addEventListener('click', () => this.downloadXLSX());
    return this.downloadButton;
  }

  /**
   * Builds the <form> element with 6 text inputs and a submit button.
   * @returns {HTMLFormElement}
   */
  createForm() {
    this.form = document.createElement('form');
    this.form.className = 'spreadsheet-form__form';
    this.form.setAttribute('data-testid', 'spreadsheet-form-form');
    this.form.noValidate = true;

    this.inputs = [];

    this.labels.forEach((label, index) => {
      const fieldWrapper = document.createElement('div');
      fieldWrapper.className = 'spreadsheet-form__field';

      const inputId = `spreadsheet-form-field-${index + 1}`;

      const labelEl = document.createElement('label');
      labelEl.setAttribute('for', inputId);
      labelEl.textContent = label;
      labelEl.className = 'spreadsheet-form__label';

      const input = document.createElement('input');
      input.type = 'text';
      input.id = inputId;
      input.name = `field${index + 1}`;
      input.className = 'spreadsheet-form__input';
      input.setAttribute('data-testid', `spreadsheet-form-input-${index + 1}`);

      fieldWrapper.appendChild(labelEl);
      fieldWrapper.appendChild(input);
      this.form.appendChild(fieldWrapper);
      this.inputs.push(input);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Add Row';
    submitButton.className = 'spreadsheet-form__submit';
    submitButton.setAttribute('data-testid', 'spreadsheet-form-submit');
    this.form.appendChild(submitButton);

    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    return this.form;
  }

  /**
   * Builds the spreadsheet <table> element with a header row for each field.
   * @returns {HTMLTableElement}
   */
  createTable() {
    this.table = document.createElement('table');
    this.table.className = 'spreadsheet-form__table';
    this.table.setAttribute('data-testid', 'spreadsheet-form-table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.labels.forEach((label) => {
      const th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    this.tbody = document.createElement('tbody');

    this.table.appendChild(thead);
    this.table.appendChild(this.tbody);
    return this.table;
  }

  /**
   * Reads the current input values, appends a row to the spreadsheet,
   * invokes onSubmit if provided, and resets the form.
   */
  handleSubmit() {
    const values = this.inputs.map((input) => input.value);
    this.addRow(values);

    if (this.onSubmit) {
      this.onSubmit(values);
    }

    this.form.reset();
    if (this.inputs[0]) {
      this.inputs[0].focus();
    }
  }

  /**
   * Appends a row of values to the spreadsheet table.
   * @param {string[]} values - Six string values, one per column.
   */
  addRow(values) {
    if (!Array.isArray(values) || values.length !== 6) {
      throw new Error('addRow requires exactly 6 values');
    }

    const row = document.createElement('tr');
    values.forEach((value) => {
      const td = document.createElement('td');
      td.textContent = value;
      row.appendChild(td);
    });

    this.tbody.appendChild(row);
    this.rows.push(values.slice());
  }

  /**
   * Returns all rows that have been added, as an array of arrays.
   * @returns {string[][]}
   */
  getRows() {
    return this.rows.map((row) => row.slice());
  }

  /**
   * Builds a SheetJS workbook from the header row and collected data rows.
   * @returns {import('xlsx').WorkBook}
   */
  toWorkbook() {
    const aoa = [this.labels.slice(), ...this.rows.map((row) => row.slice())];
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, this.sheetName);
    return workbook;
  }

  /**
   * Serializes the spreadsheet contents to an .xlsx file as a Uint8Array.
   * Useful for tests and non-browser environments.
   * @returns {Uint8Array}
   */
  toXLSXBuffer() {
    const workbook = this.toWorkbook();
    const arrayBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Triggers a browser download of the current spreadsheet as an .xlsx file.
   * @param {string} [filename] - Optional override for the download filename.
   */
  downloadXLSX(filename) {
    const workbook = this.toWorkbook();
    this.writeWorkbookFile(workbook, filename || this.filename);
  }

  /**
   * Thin wrapper around XLSX.writeFile. Exposed as an instance method so it
   * can be stubbed in tests where the browser download path is not exercised.
   * @param {import('xlsx').WorkBook} workbook
   * @param {string} filename
   */
  writeWorkbookFile(workbook, filename) {
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Serializes the spreadsheet contents (header + rows) to a CSV string.
   * @returns {string}
   */
  toCSV() {
    const escape = (value) => {
      const str = String(value ?? '');
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines = [this.labels.map(escape).join(',')];
    this.rows.forEach((row) => {
      lines.push(row.map(escape).join(','));
    });
    return lines.join('\n');
  }

  /**
   * Renders the form and spreadsheet into a container element.
   * @param {HTMLElement} container
   */
  render(container) {
    if (!container) {
      throw new Error('Container element is required');
    }
    const element = this.create();
    container.appendChild(element);
  }

  /**
   * Removes the form and spreadsheet from the DOM.
   */
  destroy() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}
