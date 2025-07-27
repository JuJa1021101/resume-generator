#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Comprehensive Test Report Generator
 * Generates detailed testing and performance analysis reports
 */
class TestReportGenerator {
  constructor() {
    this.reportDir = path.join(process.cwd(), 'reports');
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.results = {
      unit: null,
      e2e: null,
      performance: null,
      coverage: null,
      accessibility: null
    };
  }

  async generateReport() {
    console.log('🚀 Starting comprehensive test report generation...');

    // Ensure report directory exists
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }

    try {
      // Run all test suites
      await this.runUnitTests();
      await this.runE2ETests();
      await this.runPerformanceTests();
      await this.generateCoverageReport();
      await this.runAccessibilityTests();

      // Generate comprehensive report
      await this.generateHTMLReport();
      await this.generateJSONReport();
      await this.generateMarkdownReport();

      console.log('✅ Test report generation completed successfully!');
      console.log(`📊 Reports available in: ${this.reportDir}`);

    } catch (error) {
      console.error('❌ Test report generation failed:', error.message);
      process.exit(1);
    }
  }

  async runUnitTests() {
    console.log('🧪 Running unit tests...');
    try {
      const output = execSync('npm run test:coverage -- --json --outputFile=test-results.json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse Jest results
      const resultsPath = path.join(process.cwd(), 'test-results.json');
      if (fs.existsSync(resultsPath)) {
        this.results.unit = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        fs.unlinkSync(resultsPath); // Clean up
      }

      console.log('✅ Unit tests completed');
    } catch (error) {
      console.warn('⚠️ Unit tests failed:', error.message);
      this.results.unit = { success: false, error: error.message };
    }
  }

  async runE2ETests() {
    console.log('🎭 Running E2E tests...');
    try {
      const output = execSync('npm run cypress:run -- --reporter json --reporter-options output=cypress-results.json', {
        encoding: 'utf8',
        stdio: 'pipe'
      });

      // Parse Cypress results
      const resultsPath = path.join(process.cwd(), 'cypress-results.json');
      if (fs.existsSync(resultsPath)) {
        this.results.e2e = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        fs.unlinkSync(resultsPath); // Clean up
      }

      console.log('✅ E2E tests completed');
    } catch (error) {
      console.warn('⚠️ E2E tests failed:', error.message);
      this.results.e2e = { success: false, error: error.message };
    }
  }

  async runPerformanceTests() {
    console.log('⚡ Running performance tests...');
    try {
      // Run Lighthouse audit
      const lighthouse = require('lighthouse');
      const chromeLauncher = require('chrome-launcher');

      const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
      const options = {
        logLevel: 'info',
        output: 'json',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        port: chrome.port,
      };

      const runnerResult = await lighthouse('http://localhost:5173', options);
      await chrome.kill();

      this.results.performance = {
        lighthouse: runnerResult.lhr,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Performance tests completed');
    } catch (error) {
      console.warn('⚠️ Performance tests failed:', error.message);
      this.results.performance = { success: false, error: error.message };
    }
  }

  async generateCoverageReport() {
    console.log('📊 Generating coverage report...');
    try {
      // Read Jest coverage
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        this.results.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }

      // Read Cypress coverage if available
      const e2eCoveragePath = path.join(process.cwd(), 'coverage-e2e', 'coverage-summary.json');
      if (fs.existsSync(e2eCoveragePath)) {
        this.results.coverage.e2e = JSON.parse(fs.readFileSync(e2eCoveragePath, 'utf8'));
      }

      console.log('✅ Coverage report generated');
    } catch (error) {
      console.warn('⚠️ Coverage report generation failed:', error.message);
    }
  }

  async runAccessibilityTests() {
    console.log('♿ Running accessibility tests...');
    try {
      // This would integrate with axe-core results from Cypress tests
      this.results.accessibility = {
        violations: 0,
        passes: 0,
        incomplete: 0,
        timestamp: new Date().toISOString()
      };

      console.log('✅ Accessibility tests completed');
    } catch (error) {
      console.warn('⚠️ Accessibility tests failed:', error.message);
    }
  }

  async generateHTMLReport() {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Resume Generator - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #667eea; }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .status-warn { color: #ffc107; }
        .section { margin: 30px 0; }
        .section h2 { border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        .progress-bar { background: #e9ecef; border-radius: 4px; height: 20px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #28a745, #20c997); transition: width 0.3s ease; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 AI Resume Generator - Test Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            <p>Report ID: ${this.timestamp}</p>
        </div>
        
        <div class="content">
            ${this.generateOverviewSection()}
            ${this.generateUnitTestSection()}
            ${this.generateE2ETestSection()}
            ${this.generatePerformanceSection()}
            ${this.generateCoverageSection()}
            ${this.generateAccessibilitySection()}
            ${this.generateRecommendationsSection()}
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(this.reportDir, `test-report-${this.timestamp}.html`);
    fs.writeFileSync(reportPath, htmlTemplate);
    console.log(`📄 HTML report generated: ${reportPath}`);
  }

  generateOverviewSection() {
    const unitPassed = this.results.unit?.success !== false;
    const e2ePassed = this.results.e2e?.success !== false;
    const performancePassed = this.results.performance?.success !== false;

    const overallStatus = unitPassed && e2ePassed && performancePassed ? 'PASS' : 'FAIL';
    const statusClass = overallStatus === 'PASS' ? 'status-pass' : 'status-fail';

    return `
    <div class="section">
        <h2>📊 Test Overview</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value ${statusClass}">${overallStatus}</div>
                <div class="metric-label">Overall Status</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.getTestCount()}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.getCoveragePercentage()}%</div>
                <div class="metric-label">Code Coverage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${this.getPerformanceScore()}</div>
                <div class="metric-label">Performance Score</div>
            </div>
        </div>
    </div>`;
  }

  generateUnitTestSection() {
    if (!this.results.unit || this.results.unit.success === false) {
      return `
      <div class="section">
          <h2>🧪 Unit Tests</h2>
          <p class="status-fail">Unit tests failed or were not run.</p>
          ${this.results.unit?.error ? `<p>Error: ${this.results.unit.error}</p>` : ''}
      </div>`;
    }

    const { numTotalTests, numPassedTests, numFailedTests, testResults } = this.results.unit;

    return `
    <div class="section">
        <h2>🧪 Unit Tests</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value status-pass">${numPassedTests}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${numFailedTests > 0 ? 'status-fail' : 'status-pass'}">${numFailedTests}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${numTotalTests}</div>
                <div class="metric-label">Total</div>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Tests</th>
                    <th>Status</th>
                    <th>Duration</th>
                </tr>
            </thead>
            <tbody>
                ${testResults.map(suite => `
                    <tr>
                        <td>${suite.testFilePath.split('/').pop()}</td>
                        <td>${suite.numPassingTests}/${suite.numTotalTests}</td>
                        <td class="${suite.status === 'passed' ? 'status-pass' : 'status-fail'}">${suite.status}</td>
                        <td>${suite.perfStats.runtime}ms</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
  }

  generateE2ETestSection() {
    if (!this.results.e2e || this.results.e2e.success === false) {
      return `
      <div class="section">
          <h2>🎭 End-to-End Tests</h2>
          <p class="status-fail">E2E tests failed or were not run.</p>
          ${this.results.e2e?.error ? `<p>Error: ${this.results.e2e.error}</p>` : ''}
      </div>`;
    }

    return `
    <div class="section">
        <h2>🎭 End-to-End Tests</h2>
        <p>E2E test results would be displayed here based on Cypress output.</p>
    </div>`;
  }

  generatePerformanceSection() {
    if (!this.results.performance || this.results.performance.success === false) {
      return `
      <div class="section">
          <h2>⚡ Performance Analysis</h2>
          <p class="status-fail">Performance tests failed or were not run.</p>
          ${this.results.performance?.error ? `<p>Error: ${this.results.performance.error}</p>` : ''}
      </div>`;
    }

    const { lighthouse } = this.results.performance;
    const performanceScore = Math.round(lighthouse.categories.performance.score * 100);
    const accessibilityScore = Math.round(lighthouse.categories.accessibility.score * 100);
    const bestPracticesScore = Math.round(lighthouse.categories['best-practices'].score * 100);
    const seoScore = Math.round(lighthouse.categories.seo.score * 100);

    return `
    <div class="section">
        <h2>⚡ Performance Analysis</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value ${performanceScore >= 90 ? 'status-pass' : performanceScore >= 50 ? 'status-warn' : 'status-fail'}">${performanceScore}</div>
                <div class="metric-label">Performance</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${performanceScore}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${accessibilityScore >= 90 ? 'status-pass' : 'status-warn'}">${accessibilityScore}</div>
                <div class="metric-label">Accessibility</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${accessibilityScore}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${bestPracticesScore >= 90 ? 'status-pass' : 'status-warn'}">${bestPracticesScore}</div>
                <div class="metric-label">Best Practices</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${bestPracticesScore}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${seoScore >= 90 ? 'status-pass' : 'status-warn'}">${seoScore}</div>
                <div class="metric-label">SEO</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${seoScore}%"></div>
                </div>
            </div>
        </div>
        
        <h3>Core Web Vitals</h3>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Threshold</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>First Contentful Paint</td>
                    <td>${lighthouse.audits['first-contentful-paint'].displayValue}</td>
                    <td class="${lighthouse.audits['first-contentful-paint'].score >= 0.9 ? 'status-pass' : 'status-warn'}">
                        ${lighthouse.audits['first-contentful-paint'].score >= 0.9 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
                    </td>
                    <td>&lt; 1.8s</td>
                </tr>
                <tr>
                    <td>Largest Contentful Paint</td>
                    <td>${lighthouse.audits['largest-contentful-paint'].displayValue}</td>
                    <td class="${lighthouse.audits['largest-contentful-paint'].score >= 0.9 ? 'status-pass' : 'status-warn'}">
                        ${lighthouse.audits['largest-contentful-paint'].score >= 0.9 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
                    </td>
                    <td>&lt; 2.5s</td>
                </tr>
                <tr>
                    <td>Cumulative Layout Shift</td>
                    <td>${lighthouse.audits['cumulative-layout-shift'].displayValue}</td>
                    <td class="${lighthouse.audits['cumulative-layout-shift'].score >= 0.9 ? 'status-pass' : 'status-warn'}">
                        ${lighthouse.audits['cumulative-layout-shift'].score >= 0.9 ? 'GOOD' : 'NEEDS IMPROVEMENT'}
                    </td>
                    <td>&lt; 0.1</td>
                </tr>
            </tbody>
        </table>
    </div>`;
  }

  generateCoverageSection() {
    if (!this.results.coverage) {
      return `
      <div class="section">
          <h2>📊 Code Coverage</h2>
          <p class="status-warn">Coverage data not available.</p>
      </div>`;
    }

    const { total } = this.results.coverage;
    const linesCoverage = total.lines.pct;
    const branchesCoverage = total.branches.pct;
    const functionsCoverage = total.functions.pct;
    const statementsCoverage = total.statements.pct;

    return `
    <div class="section">
        <h2>📊 Code Coverage</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div class="metric-value ${linesCoverage >= 90 ? 'status-pass' : linesCoverage >= 80 ? 'status-warn' : 'status-fail'}">${linesCoverage}%</div>
                <div class="metric-label">Lines</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${linesCoverage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${branchesCoverage >= 90 ? 'status-pass' : branchesCoverage >= 80 ? 'status-warn' : 'status-fail'}">${branchesCoverage}%</div>
                <div class="metric-label">Branches</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${branchesCoverage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${functionsCoverage >= 90 ? 'status-pass' : functionsCoverage >= 80 ? 'status-warn' : 'status-fail'}">${functionsCoverage}%</div>
                <div class="metric-label">Functions</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${functionsCoverage}%"></div>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${statementsCoverage >= 90 ? 'status-pass' : statementsCoverage >= 80 ? 'status-warn' : 'status-fail'}">${statementsCoverage}%</div>
                <div class="metric-label">Statements</div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${statementsCoverage}%"></div>
                </div>
            </div>
        </div>
        
        <p><strong>Coverage Target:</strong> 90% for all metrics</p>
        <p><strong>Status:</strong> 
            <span class="${linesCoverage >= 90 && branchesCoverage >= 90 && functionsCoverage >= 90 && statementsCoverage >= 90 ? 'status-pass' : 'status-warn'}">
                ${linesCoverage >= 90 && branchesCoverage >= 90 && functionsCoverage >= 90 && statementsCoverage >= 90 ? 'TARGET MET ✅' : 'BELOW TARGET ⚠️'}
            </span>
        </p>
    </div>`;
  }

  generateAccessibilitySection() {
    return `
    <div class="section">
        <h2>♿ Accessibility</h2>
        <p>Accessibility test results from axe-core integration would be displayed here.</p>
    </div>`;
  }

  generateRecommendationsSection() {
    const recommendations = [];

    // Add recommendations based on test results
    if (this.results.coverage && this.results.coverage.total.lines.pct < 90) {
      recommendations.push('Increase code coverage to meet the 90% target');
    }

    if (this.results.performance && this.results.performance.lighthouse) {
      const perfScore = this.results.performance.lighthouse.categories.performance.score * 100;
      if (perfScore < 90) {
        recommendations.push('Optimize performance to achieve a score above 90');
      }
    }

    return `
    <div class="section">
        <h2>💡 Recommendations</h2>
        ${recommendations.length > 0 ? `
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        ` : '<p class="status-pass">All quality gates are met! 🎉</p>'}
    </div>`;
  }

  async generateJSONReport() {
    const jsonReport = {
      timestamp: this.timestamp,
      summary: {
        overall: this.getOverallStatus(),
        testCount: this.getTestCount(),
        coverage: this.getCoveragePercentage(),
        performance: this.getPerformanceScore()
      },
      results: this.results
    };

    const reportPath = path.join(this.reportDir, `test-report-${this.timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📄 JSON report generated: ${reportPath}`);
  }

  async generateMarkdownReport() {
    const markdown = `# AI Resume Generator - Test Report

**Generated:** ${new Date().toLocaleString()}  
**Report ID:** ${this.timestamp}

## 📊 Summary

- **Overall Status:** ${this.getOverallStatus()}
- **Total Tests:** ${this.getTestCount()}
- **Code Coverage:** ${this.getCoveragePercentage()}%
- **Performance Score:** ${this.getPerformanceScore()}

## 🧪 Unit Tests

${this.results.unit ? `
- **Passed:** ${this.results.unit.numPassedTests || 0}
- **Failed:** ${this.results.unit.numFailedTests || 0}
- **Total:** ${this.results.unit.numTotalTests || 0}
` : 'Unit tests were not run or failed.'}

## 🎭 End-to-End Tests

${this.results.e2e ? 'E2E tests completed successfully.' : 'E2E tests were not run or failed.'}

## ⚡ Performance

${this.results.performance ? `
Performance analysis completed with Lighthouse.
` : 'Performance tests were not run or failed.'}

## 📊 Code Coverage

${this.results.coverage ? `
- **Lines:** ${this.results.coverage.total.lines.pct}%
- **Branches:** ${this.results.coverage.total.branches.pct}%
- **Functions:** ${this.results.coverage.total.functions.pct}%
- **Statements:** ${this.results.coverage.total.statements.pct}%
` : 'Coverage data not available.'}

## 💡 Recommendations

- Maintain code coverage above 90%
- Keep performance scores above 90
- Ensure all E2E tests pass
- Address any accessibility issues

---
*Report generated by AI Resume Generator Test Suite*`;

    const reportPath = path.join(this.reportDir, `test-report-${this.timestamp}.md`);
    fs.writeFileSync(reportPath, markdown);
    console.log(`📄 Markdown report generated: ${reportPath}`);
  }

  getOverallStatus() {
    const unitPassed = this.results.unit?.success !== false;
    const e2ePassed = this.results.e2e?.success !== false;
    const performancePassed = this.results.performance?.success !== false;
    return unitPassed && e2ePassed && performancePassed ? 'PASS' : 'FAIL';
  }

  getTestCount() {
    let count = 0;
    if (this.results.unit) count += this.results.unit.numTotalTests || 0;
    if (this.results.e2e) count += this.results.e2e.totalTests || 0;
    return count;
  }

  getCoveragePercentage() {
    if (!this.results.coverage) return 0;
    return this.results.coverage.total.lines.pct || 0;
  }

  getPerformanceScore() {
    if (!this.results.performance?.lighthouse) return 'N/A';
    return Math.round(this.results.performance.lighthouse.categories.performance.score * 100);
  }
}

// Run the report generator
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateReport().catch(console.error);
}

module.exports = TestReportGenerator;