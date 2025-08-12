/**
 * network-config-manager 基本用法示例
 * 展示如何使用NetworkManager类进行网络配置管理
 */

const { NetworkManager } = require('../index');
const chalk = require('chalk');

class NetworkConfigExample {
  constructor() {
    this.networkManager = new NetworkManager();
  }

  /**
   * 示例1: 获取网络接口列表
   */
  async example1_ListInterfaces() {
    console.log(chalk.blue('\n示例1: 获取网络接口列表'));
    console.log(chalk.gray('-----------------------------------'));
    
    try {
      const interfaces = await this.networkManager.getNetworkInterfaces();
      
      console.log(chalk.green(`找到 ${interfaces.length} 个网络接口:`));
      
      interfaces.forEach(iface => {
        console.log(chalk.yellow(`\n接口: ${iface.name}`));
        console.log(`  状态: ${iface.status}`);
        console.log(`  MAC地址: ${iface.mac}`);
        
        if (iface.ipv4) {
          console.log(`  IPv4地址: ${iface.ipv4}`);
          console.log(`  子网掩码: ${iface.netmask}`);
        } else {
          console.log(`  IPv4地址: 未配置`);
        }
        
        if (iface.gateway) {
          console.log(`  网关: ${iface.gateway}`);
        }
      });
    } catch (error) {
      console.error(chalk.red(`获取网络接口列表失败: ${error.message}`));
    }
  }

  /**
   * 示例2: 获取特定接口的详细信息
   * @param {string} interfaceName 接口名称
   */
  async example2_GetInterfaceDetails(interfaceName) {
    console.log(chalk.blue(`\n示例2: 获取接口 ${interfaceName} 的详细信息`));
    console.log(chalk.gray('-----------------------------------'));
    
    try {
      // 如果未指定接口名称，则获取第一个接口
      if (!interfaceName) {
        const interfaces = await this.networkManager.getNetworkInterfaces();
        if (interfaces.length > 0) {
          interfaceName = interfaces[0].name;
          console.log(chalk.yellow(`未指定接口名称，使用第一个接口: ${interfaceName}`));
        } else {
          console.error(chalk.red('未找到网络接口'));
          return;
        }
      }
      
      const details = await this.networkManager.getInterfaceDetails(interfaceName);
      
      console.log(chalk.green(`接口 ${interfaceName} 的详细信息:`));
      console.log(JSON.stringify(details, null, 2));
    } catch (error) {
      console.error(chalk.red(`获取接口详细信息失败: ${error.message}`));
    }
  }

  /**
   * 示例3: 验证IP地址
   */
  example3_ValidateIP() {
    console.log(chalk.blue('\n示例3: 验证IP地址'));
    console.log(chalk.gray('-----------------------------------'));
    
    const testIPs = [
      '192.168.1.1',
      '10.0.0.1',
      '172.16.0.1',
      '256.0.0.1',  // 无效
      '192.168.1',  // 无效
      '192.168.1.1.1', // 无效
      'abc',        // 无效
      ''            // 无效
    ];
    
    testIPs.forEach(ip => {
      const isValid = this.networkManager.isValidIP(ip);
      if (isValid) {
        console.log(chalk.green(`✓ ${ip} 是有效的IP地址`));
      } else {
        console.log(chalk.red(`✗ ${ip} 不是有效的IP地址`));
      }
    });
  }

  /**
   * 示例4: 子网掩码转换为CIDR
   */
  example4_NetmaskToCIDR() {
    console.log(chalk.blue('\n示例4: 子网掩码转换为CIDR'));
    console.log(chalk.gray('-----------------------------------'));
    
    const testNetmasks = [
      '255.255.255.0',
      '255.255.0.0',
      '255.0.0.0',
      '255.255.255.252',
      '255.255.255.128',
      '255.255.254.0',
      '255.254.0.0'
    ];
    
    testNetmasks.forEach(netmask => {
      try {
        const cidr = this.networkManager.netmaskToCIDR(netmask);
        console.log(chalk.green(`${netmask} => /${cidr}`));
      } catch (error) {
        console.log(chalk.red(`${netmask} => 转换失败: ${error.message}`));
      }
    });
  }

  /**
   * 示例5: 模拟配置网络接口
   * @param {string} interfaceName 接口名称
   */
  async example5_SimulateConfigUpdate(interfaceName) {
    console.log(chalk.blue(`\n示例5: 模拟配置网络接口`));
    console.log(chalk.gray('-----------------------------------'));
    
    try {
      // 如果未指定接口名称，则获取第一个接口
      if (!interfaceName) {
        const interfaces = await this.networkManager.getNetworkInterfaces();
        if (interfaces.length > 0) {
          interfaceName = interfaces[0].name;
          console.log(chalk.yellow(`未指定接口名称，使用第一个接口: ${interfaceName}`));
        } else {
          console.error(chalk.red('未找到网络接口'));
          return;
        }
      }
      
      // 获取当前接口配置
      const currentConfig = await this.networkManager.getInterfaceDetails(interfaceName);
      console.log(chalk.yellow('当前配置:'));
      console.log(JSON.stringify(currentConfig, null, 2));
      
      // 模拟新配置
      const newConfig = {
        ip: '192.168.1.100',
        netmask: '255.255.255.0',
        gateway: '192.168.1.1',
        dns: ['8.8.8.8', '8.8.4.4']
      };
      
      console.log(chalk.yellow('\n模拟新配置:'));
      console.log(JSON.stringify(newConfig, null, 2));
      
      // 检查管理员权限
      const hasAdminPermissions = await this.networkManager.checkAdminPermissions();
      
      if (hasAdminPermissions) {
        console.log(chalk.green('\n✓ 具有管理员权限，可以更新网络配置'));
        console.log(chalk.yellow('注意: 这是模拟示例，不会实际更新配置'));
        // 实际应用中，可以使用以下代码更新配置
        // await this.networkManager.updateNetworkConfig(interfaceName, newConfig);
      } else {
        console.log(chalk.red('\n✗ 没有管理员权限，无法更新网络配置'));
        console.log(chalk.yellow('请使用以下命令配置sudo权限:'));
        console.log(chalk.gray(`sudo ${this.networkManager.getSudoSetupScriptPath()} install`));
      }
    } catch (error) {
      console.error(chalk.red(`模拟配置网络接口失败: ${error.message}`));
    }
  }

  /**
   * 运行所有示例
   */
  async runAllExamples() {
    console.log(chalk.bgBlue.white(' Network Config Manager 示例 '));
    
    await this.example1_ListInterfaces();
    await this.example2_GetInterfaceDetails();
    this.example3_ValidateIP();
    this.example4_NetmaskToCIDR();
    await this.example5_SimulateConfigUpdate();
    
    console.log(chalk.bgGreen.black('\n 示例运行完成 '));
  }
}

// 创建示例实例
const example = new NetworkConfigExample();

// 运行所有示例
example.runAllExamples().catch(error => {
  console.error(chalk.bgRed.white(' 错误 '), error.message);
});

module.exports = NetworkConfigExample;