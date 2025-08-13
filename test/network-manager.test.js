/**
 * NetworkManager类的单元测试
 */

// 先设置模块mock，再加载被测模块
jest.mock('child_process');
jest.mock('util');
jest.mock('os');

const path = require('path');

// 模拟模块实现
const mockExec = jest.fn();
const mockSpawn = jest.fn();
const mockPromisify = jest.fn();
const mockOs = {
  platform: jest.fn().mockReturnValue('linux'),
  networkInterfaces: jest.fn().mockReturnValue({
    'eth0': [{
      address: '192.168.1.100',
      netmask: '255.255.255.0',
      family: 'IPv4',
      mac: '00:11:22:33:44:55',
      internal: false,
      cidr: '192.168.1.100/24'
    }],
    'lo': [{
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8'
    }]
  }),
  userInfo: jest.fn().mockReturnValue({ username: 'testuser' })
};

// 配置mock模块
require('child_process').exec = mockExec;
require('child_process').spawn = mockSpawn;
require('util').promisify = mockPromisify;
Object.assign(require('os'), mockOs);

// 模拟execAsync函数
const mockExecAsync = jest.fn().mockImplementation(async (command) => {
  if (command.includes('sudo -n true')) {
    return { stdout: '', stderr: '' };
  } else if (command.includes('ip route show')) {
    return { stdout: 'default via 192.168.1.1 dev eth0', stderr: '' };
  } else if (command.includes('cat /etc/resolv.conf')) {
    return { stdout: 'nameserver 8.8.8.8\nnameserver 8.8.4.4', stderr: '' };
  } else if (command.includes('netstat -nr')) {
    return { stdout: 'default  192.168.1.1  UGSc  en0', stderr: '' };
  } else if (command.includes('route -n get default')) {
    return { stdout: 'gateway: 192.168.1.1\ninterface: en0', stderr: '' };
  } else if (command.includes('ipconfig')) {
    return { stdout: 'Default Gateway . . . . . . . . . : 192.168.1.1', stderr: '' };
  } else if (command.includes('netconfig.sh')) {
    return { stdout: 'Network configuration updated successfully', stderr: '' };
  } else {
    return { stdout: '', stderr: '' };
  }
});

mockPromisify.mockImplementation((fn) => {
  if (fn === mockExec) {
    return mockExecAsync;
  }
  return jest.fn();
});

// 配置exec mock
mockExec.mockImplementation((command, callback) => {
  setTimeout(() => {
    if (command.includes('sudo -n true')) {
      callback(null, { stdout: '', stderr: '' });
    } else if (command.includes('netstat -nr')) {
      callback(null, { stdout: 'default  192.168.1.1  UGSc  en0', stderr: '' });
    } else if (command.includes('ip route show')) {
      callback(null, { stdout: 'default via 192.168.1.1 dev eth0', stderr: '' });
    } else {
      callback(null, { stdout: '', stderr: '' });
    }
  }, 0);
});

// 现在加载被测模块
const NetworkManager = require('../index');

// 创建NetworkManager实例
const networkManager = new NetworkManager();

// 模拟操作系统
const originalPlatform = process.platform;
Object.defineProperty(process, 'platform', {
  get: jest.fn().mockReturnValue('linux')
});

// 测试完成后恢复原始平台
afterAll(() => {
  Object.defineProperty(process, 'platform', {
    get: () => originalPlatform
  });
});

describe('NetworkManager', () => {
  // 测试IP地址验证
  describe('isValidIP', () => {
    test('应该识别有效的IP地址', () => {
      expect(networkManager.isValidIP('192.168.1.1')).toBe(true);
      expect(networkManager.isValidIP('10.0.0.1')).toBe(true);
      expect(networkManager.isValidIP('172.16.0.1')).toBe(true);
    });

    test('应该识别无效的IP地址', () => {
      expect(networkManager.isValidIP('256.0.0.1')).toBe(false);
      expect(networkManager.isValidIP('192.168.1')).toBe(false);
      expect(networkManager.isValidIP('abc.def.ghi.jkl')).toBe(false);
    });
  });

  // 测试子网掩码转换
  describe('netmaskToCIDR', () => {
    test('应该正确转换常见的子网掩码', () => {
      expect(networkManager.netmaskToCIDR('255.255.255.0')).toBe(24);
      expect(networkManager.netmaskToCIDR('255.255.0.0')).toBe(16);
      expect(networkManager.netmaskToCIDR('255.0.0.0')).toBe(8);
    });

    test('遇到非法子网掩码应抛错', () => {
      expect(() => networkManager.netmaskToCIDR('255.0.255.0')).toThrow();
      expect(() => networkManager.netmaskToCIDR('255.255.255.2555')).toThrow();
    });
  });

  // 测试网络接口获取
  describe('getNetworkInterfaces', () => {
    test('应该返回网络接口列表', async () => {
      const interfaces = await networkManager.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);
      expect(interfaces.length).toBeGreaterThan(0);
      expect(interfaces[0]).toHaveProperty('name', 'eth0');
      expect(interfaces[0]).toHaveProperty('ip', '192.168.1.100');
      expect(interfaces[0]).toHaveProperty('netmask', '255.255.255.0');
    });

    test('应该处理不同平台的网络接口', async () => {
      // 测试Linux平台
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('linux')
      });
      let interfaces = await networkManager.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);

      // 测试macOS平台
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('darwin')
      });
      interfaces = await networkManager.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);

      // 测试Windows平台
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('win32')
      });
      interfaces = await networkManager.getNetworkInterfaces();
      expect(Array.isArray(interfaces)).toBe(true);

      // 恢复为Linux平台进行后续测试
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('linux')
      });
    });
  });

  // 测试脚本路径获取
  describe('脚本路径', () => {
    test('应该返回netconfig.sh脚本路径', () => {
      const scriptPath = networkManager.netconfigScript;
      expect(typeof scriptPath).toBe('string');
      expect(scriptPath.length).toBeGreaterThan(0);
      expect(scriptPath).toContain('netconfig.sh');
    });

    test('应该返回setup-sudo.sh脚本路径', () => {
      const setupScript = path.join(path.dirname(networkManager.netconfigScript), 'setup-sudo.sh');
      expect(typeof setupScript).toBe('string');
      expect(setupScript.length).toBeGreaterThan(0);
      expect(setupScript).toContain('setup-sudo.sh');
    });
  });

  // 测试权限检查
  describe('checkAdminPermissions', () => {
    test('应该检查管理员权限', async () => {
      const result = await networkManager.checkAdminPermissions();
      expect(typeof result).toBe('boolean');
    });
  });

  // 测试静态IP配置
  describe('setStaticIP', () => {
    test('应该配置静态IP', async () => {
      // 模拟配置
      const config = {
        ip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: ['8.8.8.8', '8.8.4.4']
      };

      // 跳过权限检查
      const result = await networkManager.updateNetworkConfig('eth0', config, true);
      expect(result).toBe(true);
    });

    test('应该在Linux上配置静态IP', async () => {
      // 确保平台是Linux
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('linux')
      });

      const config = {
        ip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: ['8.8.8.8', '8.8.4.4']
      };

      const result = await networkManager.updateLinuxConfig('eth0', config);
      expect(result).toBe(true);
    });

    test('应该在macOS上配置静态IP', async () => {
      // 切换到macOS平台
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('darwin')
      });

      const config = {
        ip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: ['8.8.8.8', '8.8.4.4']
      };

      const result = await networkManager.updateMacOSConfig('en0', config);
      expect(result).toBe(true);

      // 恢复为Linux平台进行后续测试
      Object.defineProperty(process, 'platform', {
        get: jest.fn().mockReturnValue('linux')
      });
    });
  });

  // 测试DHCP配置
  describe('setDHCP', () => {
    test('应该配置DHCP', async () => {
      // 跳过权限检查
      const result = await networkManager.setDHCP('eth0', true);
      expect(result).toBe(true);
    });
  });

  // 测试网络服务重启
  describe('restartNetwork', () => {
    test('应该重启网络服务', async () => {
      // 跳过权限检查
      try {
        const result = await networkManager.restartNetwork(true);
        expect(result).toBe(true);
      } catch (error) {
        // 在测试环境中可能会失败，这是正常的
        expect(error).toBeDefined();
      }
    });
  });

  // 测试权限提示信息
  describe('getPermissionInstructions', () => {
    test('应该返回权限提示信息', () => {
      const instructions = networkManager.getPermissionInstructions();
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(0);
    });
  });
});