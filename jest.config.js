/**
 * Jest配置文件
 */

module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/test/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  
  // 覆盖率收集
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.js',
    'index.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // 覆盖率报告格式
  coverageReporters: ['text', 'lcov'],
  
  // 测试超时时间（毫秒）
  testTimeout: 10000,
  
  // 详细输出
  verbose: true,
  
  // 在运行测试之前清除模拟
  clearMocks: true,
  
  // 允许测试使用ES模块
  transform: {},
  
  // 忽略的路径
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ]
};