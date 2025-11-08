/**
 * Excel Test Case Generator
 * Generates comprehensive test case Excel files from flow analysis
 */

const ExcelJS = require('exceljs');
const path = require('path');

class ExcelGenerator {
  constructor() {
    this.workbook = null;
  }

  /**
   * Generate Excel file with test cases, test data, and results sheets
   * @param {Object} session - Session data
   * @param {Object} flowAnalysis - Flow analysis with detected flows
   * @param {Array} testCases - AI-generated test cases
   * @param {string} outputPath - Path to save Excel file
   */
  async generateTestCaseExcel(session, flowAnalysis, testCases, outputPath) {
    this.workbook = new ExcelJS.Workbook();

    // Set workbook properties
    this.workbook.creator = 'Testmug';
    this.workbook.created = new Date();
    this.workbook.modified = new Date();

    // Create sheets
    await this.createTestCasesSheet(session, flowAnalysis, testCases);
    await this.createTestDataSheet(testCases);
    await this.createResultsSheet();
    await this.createSummarySheet(session, flowAnalysis);

    // Save file
    await this.workbook.xlsx.writeFile(outputPath);
    console.log('[ExcelGenerator] Excel file created:', outputPath);

    return {
      success: true,
      filePath: outputPath,
      testCount: testCases.length
    };
  }

  /**
   * Create Test Cases sheet
   */
  async createTestCasesSheet(session, flowAnalysis, testCases) {
    const sheet = this.workbook.addWorksheet('Test Cases', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Define columns
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Flow', key: 'flow', width: 20 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Test Name', key: 'name', width: 40 },
      { header: 'Description', key: 'description', width: 50 },
      { header: 'Priority', key: 'priority', width: 12 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add test cases
    testCases.forEach((testCase, index) => {
      const row = sheet.addRow({
        id: testCase.id,
        flow: testCase.flowName,
        type: testCase.type,
        name: testCase.name,
        description: testCase.description,
        priority: testCase.priority,
        status: 'Not Run'
      });

      // Color code by type
      if (testCase.type === 'positive') {
        row.getCell('type').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' }
        };
      } else if (testCase.type === 'negative') {
        row.getCell('type').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }
        };
      }

      // Priority colors
      const priorityCell = row.getCell('priority');
      if (testCase.priority === 'High') {
        priorityCell.font = { color: { argb: 'FFDC2626' }, bold: true };
      } else if (testCase.priority === 'Medium') {
        priorityCell.font = { color: { argb: 'FFEA580C' } };
      }
    });

    // Add borders
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  /**
   * Create Test Data sheet
   */
  async createTestDataSheet(testCases) {
    const sheet = this.workbook.addWorksheet('Test Data', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Define columns
    sheet.columns = [
      { header: 'Test ID', key: 'testId', width: 10 },
      { header: 'Field', key: 'field', width: 20 },
      { header: 'Value', key: 'value', width: 30 },
      { header: 'Expected Result', key: 'expected', width: 40 }
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add test data
    testCases.forEach(testCase => {
      if (testCase.testData && testCase.testData.length > 0) {
        testCase.testData.forEach(data => {
          sheet.addRow({
            testId: testCase.id,
            field: data.field,
            value: data.value,
            expected: data.expected || testCase.expectedResult
          });
        });
      }
    });

    // Add borders
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
  }

  /**
   * Create Results sheet
   */
  async createResultsSheet() {
    const sheet = this.workbook.addWorksheet('Results', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    // Define columns
    sheet.columns = [
      { header: 'Test ID', key: 'testId', width: 10 },
      { header: 'Run Date', key: 'runDate', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Duration (s)', key: 'duration', width: 12 },
      { header: 'Screenshot', key: 'screenshot', width: 30 },
      { header: 'Error Message', key: 'error', width: 50 }
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC000' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add placeholder text
    sheet.addRow({
      testId: '',
      runDate: '',
      status: 'Results will appear here after test execution',
      duration: '',
      screenshot: '',
      error: ''
    });
  }

  /**
   * Create Summary sheet
   */
  async createSummarySheet(session, flowAnalysis) {
    const sheet = this.workbook.addWorksheet('Summary', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF9C27B0' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add summary data
    const summaryData = [
      { metric: 'Session ID', value: session.id },
      { metric: 'Start URL', value: session.startUrl },
      { metric: 'Recorded Actions', value: session.actionCount },
      { metric: 'Duration', value: `${Math.round(session.duration / 1000)}s` },
      { metric: 'Flows Detected', value: flowAnalysis.flowCount || 0 },
      { metric: 'Total Assertions', value: session.assertions?.length || 0 },
      { metric: 'Created At', value: new Date(session.createdAt).toLocaleString() },
      { metric: 'AI Provider', value: flowAnalysis.provider || 'unknown' },
      { metric: 'Analysis Duration', value: `${flowAnalysis.duration}ms` }
    ];

    summaryData.forEach(item => {
      const row = sheet.addRow(item);
      row.getCell('metric').font = { bold: true };
    });

    // Add flow details
    sheet.addRow({ metric: '', value: '' }); // Spacer
    sheet.addRow({ metric: 'Flow Details', value: '' }).font = { bold: true, size: 12 };

    if (flowAnalysis.flows) {
      flowAnalysis.flows.forEach((flow, idx) => {
        sheet.addRow({ metric: `Flow ${idx + 1}`, value: `${flow.name} (${flow.type})` });
        sheet.addRow({ metric: '  Description', value: flow.description });
        sheet.addRow({ metric: '  Assertions', value: flow.assertions?.length || 0 });
      });
    }
  }

  /**
   * Update Results sheet with test execution results
   */
  async updateResults(excelPath, results) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const sheet = workbook.getWorksheet('Results');

    // Clear existing results (keep header)
    sheet.spliceRows(2, sheet.rowCount - 1);

    // Add new results
    results.forEach(result => {
      const row = sheet.addRow({
        testId: result.testId,
        runDate: new Date().toLocaleString(),
        status: result.status,
        duration: result.duration?.toFixed(2),
        screenshot: result.screenshotPath || '-',
        error: result.error || '-'
      });

      // Color code status
      const statusCell = row.getCell('status');
      if (result.status === 'Pass') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD1FAE5' }
        };
        statusCell.font = { color: { argb: 'FF065F46' }, bold: true };
      } else if (result.status === 'Fail') {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' }
        };
        statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
      }

      // Make screenshot a hyperlink if exists
      if (result.screenshotPath && result.screenshotPath !== '-') {
        row.getCell('screenshot').value = {
          text: path.basename(result.screenshotPath),
          hyperlink: result.screenshotPath
        };
        row.getCell('screenshot').font = { color: { argb: 'FF0000FF' }, underline: true };
      }

      // Add borders
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Update Test Cases sheet status
    const testCasesSheet = workbook.getWorksheet('Test Cases');
    results.forEach(result => {
      testCasesSheet.eachRow((row, rowNumber) => {
        if (row.getCell('id').value === result.testId) {
          row.getCell('status').value = result.status;

          if (result.status === 'Pass') {
            row.getCell('status').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD1FAE5' }
            };
            row.getCell('status').font = { color: { argb: 'FF065F46' }, bold: true };
          } else if (result.status === 'Fail') {
            row.getCell('status').fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFEE2E2' }
            };
            row.getCell('status').font = { color: { argb: 'FF991B1B' }, bold: true };
          }
        }
      });
    });

    await workbook.xlsx.writeFile(excelPath);
    console.log('[ExcelGenerator] Results updated in Excel:', excelPath);
  }
}

module.exports = ExcelGenerator;
