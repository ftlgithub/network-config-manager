/**
 * NetworkManager类的单元测试
 */

const { NetworkManager } = require('../index');

// 创建NetworkManager实例
const networkManager = new NetworkManager();

describe('NetworkManager', () => {
  // 测试IP地址验证
  describe('isValidIP', () => {
    test('应该验证有效的IP地址', () => {
      expect(networkManager.isValidIP('192.168.1.1')).toBe(true);
      expect(networkManager.isValidIP('10.0.0.1')).toBe(true);
      expect(networkManager.isValidIP('172.16.0.1')).toBe(true);
      expect(networkManager.isValidIP('127.0.0.1')).toBe(true);
      expect(networkManager.isValidIP('0.0.0.0')).toBe(true);
      expect(networkManager.isValidIP('255.255.255.255')).toBe(true);
    });

    test('应该拒绝无效的IP地址', () => {
      expect(networkManager.isValidIP('256.0.0.1')).toBe(false);
      expect(networkManager.isValidIP('192.168.1')).toBe(false);
      expect(networkManager.isValidIP('192.168.1.1.1')).toBe(false);
      expect(networkManager.isValidIP('abc')).toBe(false);
      expect(networkManager.isValidIP('')).toBe(false);
      expect(networkManager.isValidIP(null)).toBe(false);
      expect(networkManager.isValidIP(undefined)).toBe(false);
    });
  });

  // 测试子网掩码转换为CIDR
  describe('netmaskToCIDR', () => {
    test('应该正确转换常见的子网掩码', () => {
      expect(networkManager.netmaskToCIDR('255.255.255.0')).toBe(24);
      expect(networkManager.netmaskToCIDR('255.255.0.0')).toBe(16);
      expect(networkManager.netmaskToCIDR('255.0.0.0')).toBe(8);
      expect(networkManager.netmaskToCIDR('255.255.255.252')).toBe(30);
      expect(networkManager.netmaskToCIDR('255.255.255.128')).toBe(25);
      expect(networkManager.netmaskToCIDR('255.255.254.0')).toBe(23);
    });

    test('应该处理边界情况', () => {
      expect(networkManager.netmaskToCIDR('0.0.0.0')).toBe(0);
      expect(networkManager.netmaskToCIDR('255.255.255.255')).toBe(32);
    });

    test('应该拒绝无效的子网掩码', () => {
      expect(() => networkManager.netmaskToCIDR('256.0.0.0')).toThrow();
      expect(() => networkManager.netmaskToCIDR('255.255.255')).toThrow();
      expect(() => networkManager.netmaskToCIDR('255.255.255.1')).toThrow();
      expect(() => networkManager.netmaskToCIDR('abc')).toThrow();
      expect(() => networkManager.netmaskToCIDR('')).toThrow();
      expect(() => networkManager.netmaskToCIDR(null)).toThrow();
      expect(() => networkManager.netmaskToCIDR(undefined)).toThrow();
    });
  });

  // 测试获取网络接口列表（集成测试）
  describe('getNetworkInterfaces', () => {
    test('应该返回网络接口列表', async () => {
      // 这是一个集成测试，需要实际的网络环境
      // 我们只测试函数是否返回数组，而不测试具体内容
      const interfaces = await networkManager.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);
    });
  });

  // 测试脚本路径获取
  describe('脚本路径', () => {
    test('应该返回netconfig.sh脚本路径', () => {
      const path = networkManager.getNetconfigScriptPath();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
      expect(path).toContain('netconfig.sh');
    });

    test('应该返回setup-sudo.sh脚本路径', () => {
      const path = networkManager.getSudoSetupScriptPath();
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
      expect(path).toContain('setup-sudo.sh');
    });
  });
});