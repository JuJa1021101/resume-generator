#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive Test Execution Script
 * Runs all test suites according to task requirements
 */
class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: null,
      tests: {
        unit: { status: 'pending', duration: 0, coverage: null },
        e2e: { status: 'pending', duration: 0, results: null },
        crossBrowser: { status: 'pending', duration: 0, browsers: [] },
        performance: { status: 'pending', duration: 0, metrics: null },
        aiAccuracy: { status: 'pending', duration: 0, accuracy: null },
        coverage: { status: 'pending', percentage: 0, threshold: 90 }
      },
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        overallStatus: 'pending'
      }
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Testing Suite');
    console.log('=====================================');

    try {
      // 1. 编写端到端用户流程测试(Cypress)
      await this.runE2ETests();

      // 2. 执行跨浏览器兼容性测试
      await this.runCrossBrowserTests();

      // 3. 进行性能基准测试和优化验证
      await this.runPerformanceTests();

      // 4. 实施代码覆盖率检查(目标90%+)
      await this.runCoverageTests();

      // 5. 执行AI功能准确性和一致性测试
      await this.runAIAccuracyTests();

      // 6. 生成测试报告和性能分析文档
      await this.generateReports();

      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      this.printSummary();

    } catch (error) {
      console.error('❌ Comprehensive testing failed:', error.message);
      process.exit(1);
    }
  }

  async runE2ETests() {
    console.log('\n🎭 Running End-to-End User Flow Tests...');
    const startTime = Date.now();

    try {
      // Start development server
      console.log('Starting development server...');
      const serverProcess = this.startDevServer();

      // Wait for server to be ready
      await this.waitForServer('http://localhost:5173');

      // Run E2E tests
      execSync('npm run cypress:run -- --spec "cypress/e2e/user-flow.cy.ts"', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      this.results.tests.e2e.status = 'passed';
      console.log('✅ E2E tests completed successfully');

      // Stop server
      serverProcess.kill();

    } catch (error) {
      this.results.tests.e2e.status = 'failed';
      console.error('❌ E2E tests failed:', error.message);
    } finally {
      this.results.tests.e2e.duration = Date.now() - startTime;
    }
  }

  async runCrossBrowserTests() {
    console.log('\n🌐 Running Cross-Browser Compatibility Tests...');
    const startTime = Date.now();

    const browsers = ['chrome', 'firefox', 'edge'];
    const results = [];

    try {
      const serverProcess = this.startDevServer();
      await this.waitForServer('http://localhost:5173');

      for (const browser of browsers) {
        console.log(`Testing in ${browser}...`);
        try {
          execSync(`npm run cypress:run:${browser} -- --spec "cypress/e2e/cross-browser.cy.ts"`, {
            stdio: 'inherit',
            encoding: 'utf8'
          });
          results.push({ browser, status: 'passed' });
          console.log(`✅ ${browser} tests passed`);
        } catch (error) {
          results.push({ browser, status: 'failed', error: error.message });
          console.error(`❌ ${browser} tests failed`);
        }
      }

      this.results.tests.crossBrowser.browsers = results;
      this.results.tests.crossBrowser.status = results.every(r => r.status === 'passed') ? 'passed' : 'failed';

      serverProcess.kill();

    } catch (error) {
      this.results.tests.crossBrowser.status = 'failed';
      console.error('❌ Cross-browser tests failed:', error.message);
    } finally {
      this.results.tests.crossBrowser.duration = Date.now() - startTime;
    }
  }

  async runPerformanceTests() {
    console.log('\n⚡ Running Performance Benchmark Tests...');
    const startTime = Date.now();

    try {
      const serverProcess = this.startDevServer();
      await this.waitForServer('http://localhost:5173');

      // Run performance tests
      execSync('npm run test:performance', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      // Run benchmark tests
      execSync('npm run test:benchmark', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      this.results.tests.performance.status = 'passed';
      console.log('✅ Performance tests completed successfully');

      serverProcess.kill();

    } catch (error) {
      this.results.tests.performance.status = 'failed';
      console.error('❌ Performance tests failed:', error.message);
    } finally {
      this.results.tests.performance.duration = Date.now() - startTime;
    }
  }

  async runCoverageTests() {
    console.log('\n📊 Running Code Coverage Tests (Target: 90%+)...');
    const startTime = Date.now();

    try {
      // Run unit tests with coverage
      execSync('npm run test:coverage', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      // Check coverage results
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        const totalCoverage = coverage.total;

        this.results.tests.coverage.percentage = totalCoverage.lines.pct;

        // Check if coverage meets 90% threshold
        const meetsThreshold =
          totalCoverage.lines.pct >= 90 &&
          totalCoverage.branches.pct >= 90 &&
          totalCoverage.functions.pct >= 90 &&
          totalCoverage.statements.pct >= 90;

        this.results.tests.coverage.status = meetsThreshold ? 'passed' : 'failed';

        console.log(`📊 Coverage Results:`);
        console.log(`   Lines: ${totalCoverage.lines.pct}%`);
        console.log(`   Branches: ${totalCoverage.branches.pct}%`);
        console.log(`   Functions: ${totalCoverage.functions.pct}%`);
        console.log(`   Statements: ${totalCoverage.statements.pct}%`);

        if (meetsThreshold) {
          console.log('✅ Coverage threshold (90%) met!');
        } else {
          console.log('❌ Coverage below 90% threshold');
        }
      }

    } catch (error) {
      this.results.tests.coverage.status = 'failed';
      console.error('❌ Coverage tests failed:', error.message);
    } finally {
      this.results.tests.coverage.duration = Date.now() - startTime;
    }
  }

  async runAIAccuracyTests() {
    console.log('\n🤖 Running AI Functionality Accuracy Tests...');
    const startTime = Date.now();

    try {
      const serverProcess = this.startDevServer();
      await this.waitForServer('http://localhost:5173');

      // Run AI accuracy tests
      execSync('npm run test:ai-accuracy', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      this.results.tests.aiAccuracy.status = 'passed';
      console.log('✅ AI accuracy tests completed successfully');

      serverProcess.kill();

    } catch (error) {
      this.results.tests.aiAccuracy.status = 'failed';
      console.error('❌ AI accuracy tests failed:', error.message);
    } finally {
      this.results.tests.aiAccuracy.duration = Date.now() - startTime;
    }
  }

  async generateReports() {
    console.log('\n📄 Generating Test Reports and Performance Analysis...');

    try {
      // Generate comprehensive test report
      execSync('npm run test:report', {
        stdio: 'inherit',
        encoding: 'utf8'
      });

      console.log('✅ Test reports generated successfully');

    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
    }
  }

  startDevServer() {
    const { spawn } = require('child_process');
    const serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true
    });

    // Give server time to start
    return serverProcess;
  }

  async waitForServer(url, timeout = 30000) {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          console.log('✅ Development server is ready');
          return;
        }
      } catch (error) {
        // Server not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Development server failed to start within timeout');
  }

  printSummary() {
    console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
    console.log('==============================');

    const tests = this.results.tests;
    let totalPassed = 0;
    let totalFailed = 0;

    Object.entries(tests).forEach(([testType, result]) => {
      const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏳';
      const duration = `${(result.duration / 1000).toFixed(1)}s`;

      console.log(`${status} ${testType.padEnd(15)} - ${result.status.padEnd(7)} (${duration})`);

      if (result.status === 'passed') totalPassed++;
      if (result.status === 'failed') totalFailed++;
    });

    console.log('\n📈 OVERALL RESULTS:');
    console.log(`   Total Duration: ${(this.results.duration / 1000).toFixed(1)}s`);
    console.log(`   Tests Passed: ${totalPassed}`);
    console.log(`   Tests Failed: ${totalFailed}`);
    console.log(`   Coverage: ${this.results.tests.coverage.percentage}%`);

    const overallStatus = totalFailed === 0 ? 'PASSED' : 'FAILED';
    const statusIcon = overallStatus === 'PASSED' ? '🎉' : '💥';

    console.log(`\n${statusIcon} OVERALL STATUS: ${overallStatus}`);

    if (overallStatus === 'PASSED') {
      console.log('\n🎯 All quality gates met!');
      console.log('   ✅ End-to-end user flows working');
      console.log('   ✅ Cross-browser compatibility verified');
      console.log('   ✅ Performance benchmarks met');
      console.log('   ✅ Code coverage above 90%');
      console.log('   ✅ AI functionality accuracy validated');
      console.log('   ✅ Test reports generated');
    } else {
      console.log('\n⚠️  Some quality gates failed. Check the logs above for details.');
    }

    // Save results to file
    const resultsPath = path.join(process.cwd(), 'test-results-summary.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Detailed results saved to: ${resultsPath}`);
  }
}

// Run comprehensive tests if this script is executed directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = ComprehensiveTestRunner;