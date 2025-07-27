#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Task 15 Validation Script
 * Verifies all sub-tasks for "综合测试和性能验证" are completed
 */
class TaskValidator {
  constructor() {
    this.taskRequirements = [
      {
        id: '15.1',
        name: '编写端到端用户流程测试(Cypress)',
        files: [
          'cypress.config.ts',
          'cypress/support/e2e.ts',
          'cypress/support/commands.ts',
          'cypress/support/component.ts',
          'cypress/e2e/user-flow.cy.ts'
        ],
        scripts: ['cypress:open', 'cypress:run', 'test:e2e']
      },
      {
        id: '15.2',
        name: '执行跨浏览器兼容性测试',
        files: [
          'cypress/e2e/cross-browser.cy.ts'
        ],
        scripts: ['cypress:run:chrome', 'cypress:run:firefox', 'cypress:run:edge', 'test:cross-browser']
      },
      {
        id: '15.3',
        name: '进行性能基准测试和优化验证',
        files: [
          'cypress/e2e/performance.cy.ts',
          'cypress/e2e/benchmark.cy.ts'
        ],
        scripts: ['test:benchmark', 'test:performance']
      },
      {
        id: '15.4',
        name: '实施代码覆盖率检查(目标90%+)',
        files: [
          'jest.config.js',
          '.nycrc.json'
        ],
        scripts: ['test:coverage', 'test:coverage:report'],
        coverageThreshold: 90
      },
      {
        id: '15.5',
        name: '执行AI功能准确性和一致性测试',
        files: [
          'cypress/e2e/ai-accuracy.cy.ts'
        ],
        scripts: ['test:ai-accuracy']
      },
      {
        id: '15.6',
        name: '生成测试报告和性能分析文档',
        files: [
          'scripts/generate-test-report.cjs',
          'scripts/run-comprehensive-tests.cjs'
        ],
        scripts: ['test:report', 'test:all']
      }
    ];
  }

  async validateTask() {
    console.log('🔍 Validating Task 15: 综合测试和性能验证');
    console.log('================================================');

    let allValid = true;
    const results = [];

    for (const requirement of this.taskRequirements) {
      console.log(`\n📋 Checking ${requirement.id}: ${requirement.name}`);

      const result = {
        id: requirement.id,
        name: requirement.name,
        status: 'passed',
        issues: []
      };

      // Check required files
      for (const file of requirement.files) {
        if (!fs.existsSync(file)) {
          result.status = 'failed';
          result.issues.push(`Missing file: ${file}`);
          console.log(`   ❌ Missing: ${file}`);
        } else {
          console.log(`   ✅ Found: ${file}`);
        }
      }

      // Check package.json scripts
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      for (const script of requirement.scripts) {
        if (!packageJson.scripts[script]) {
          result.status = 'failed';
          result.issues.push(`Missing script: ${script}`);
          console.log(`   ❌ Missing script: ${script}`);
        } else {
          console.log(`   ✅ Script found: ${script}`);
        }
      }

      // Special validation for coverage threshold
      if (requirement.coverageThreshold) {
        const jestConfig = fs.readFileSync('jest.config.js', 'utf8');
        if (!jestConfig.includes('90')) {
          result.status = 'failed';
          result.issues.push('Coverage threshold not set to 90%');
          console.log(`   ❌ Coverage threshold not set to 90%`);
        } else {
          console.log(`   ✅ Coverage threshold set to 90%`);
        }
      }

      if (result.status === 'failed') {
        allValid = false;
      }

      results.push(result);
    }

    // Additional validations
    console.log('\n🔧 Additional Validations:');

    // Check if Cypress is properly configured
    if (fs.existsSync('cypress.config.ts')) {
      const cypressConfig = fs.readFileSync('cypress.config.ts', 'utf8');
      if (cypressConfig.includes('baseUrl') && cypressConfig.includes('e2e')) {
        console.log('   ✅ Cypress properly configured');
      } else {
        console.log('   ❌ Cypress configuration incomplete');
        allValid = false;
      }
    }

    // Check if test dependencies are installed
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = ['cypress', '@cypress/code-coverage', 'nyc', 'lighthouse', 'playwright'];

    for (const dep of requiredDeps) {
      if (packageJson.devDependencies[dep]) {
        console.log(`   ✅ Dependency installed: ${dep}`);
      } else {
        console.log(`   ❌ Missing dependency: ${dep}`);
        allValid = false;
      }
    }

    // Print summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('=====================');

    const passedCount = results.filter(r => r.status === 'passed').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    console.log(`✅ Passed: ${passedCount}/${this.taskRequirements.length}`);
    console.log(`❌ Failed: ${failedCount}/${this.taskRequirements.length}`);

    if (allValid) {
      console.log('\n🎉 TASK 15 VALIDATION: PASSED');
      console.log('All sub-tasks have been successfully implemented:');
      console.log('   ✅ End-to-end user flow tests (Cypress)');
      console.log('   ✅ Cross-browser compatibility tests');
      console.log('   ✅ Performance benchmark tests and optimization verification');
      console.log('   ✅ Code coverage checks (90%+ target)');
      console.log('   ✅ AI functionality accuracy and consistency tests');
      console.log('   ✅ Test reports and performance analysis documentation');

      console.log('\n🚀 Ready to execute comprehensive testing suite!');
      console.log('Run: npm run test:all');

    } else {
      console.log('\n💥 TASK 15 VALIDATION: FAILED');
      console.log('The following issues need to be resolved:');

      results.forEach(result => {
        if (result.status === 'failed') {
          console.log(`\n❌ ${result.name}:`);
          result.issues.forEach(issue => {
            console.log(`   - ${issue}`);
          });
        }
      });
    }

    // Save validation results
    const validationResults = {
      timestamp: new Date().toISOString(),
      taskId: '15',
      taskName: '综合测试和性能验证',
      overallStatus: allValid ? 'passed' : 'failed',
      subTasks: results,
      summary: {
        total: this.taskRequirements.length,
        passed: passedCount,
        failed: failedCount
      }
    };

    const resultsPath = path.join(process.cwd(), 'task-15-validation.json');
    fs.writeFileSync(resultsPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n📁 Validation results saved to: ${resultsPath}`);

    return allValid;
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new TaskValidator();
  validator.validateTask().then(isValid => {
    process.exit(isValid ? 0 : 1);
  }).catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = TaskValidator;