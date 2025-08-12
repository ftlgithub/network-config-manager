#!/usr/bin/env node

/**
 * network-config-manager 命令行工具
 * 提供简单的命令行界面，用于管理网络配置
 */

const { NetworkManager } = require('../index');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { program } = require('commander');

// 创建NetworkManager实例
const networkManager = new NetworkManager();

// 设置版本号和描述
program
  .version(require('../package.json').version)
  .description('跨平台网络配置管理工具');

// 列出网络接口命令
program
  .command('list')
  .description('列出所有网络接口')
  .action(async () => {
    try {
      const interfaces = await networkManager.getNetworkInterfaces();
      
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
      process.exit(1);
    }
  });

// 显示接口详情命令
program
  .command('show <interface>')
  .description('显示指定网络接口的详细信息')
  .action(async (interfaceName) => {
    try {
      const details = await networkManager.getInterfaceDetails(interfaceName);
      
      console.log(chalk.green(`接口 ${interfaceName} 的详细信息:`));
      console.log(JSON.stringify(details, null, 2));
    } catch (error) {
      console.error(chalk.red(`获取接口详细信息失败: ${error.message}`));
      process.exit(1);
    }
  });

// 配置静态IP命令
program
  .command('set-static <interface>')
  .description('配置网络接口为静态IP')
  .option('-i, --ip <ip>', 'IP地址')
  .option('-m, --netmask <netmask>', '子网掩码')
  .option('-g, --gateway <gateway>', '网关地址')
  .option('-d, --dns <dns>', 'DNS服务器地址（逗号分隔多个地址）')
  .action(async (interfaceName, options) => {
    try {
      // 检查管理员权限
      const hasAdminPermissions = await networkManager.checkAdminPermissions();
      
      if (!hasAdminPermissions) {
        console.error(chalk.red('需要管理员权限才能配置网络接口'));
        console.log(chalk.yellow('请使用以下命令配置sudo权限:'));
        console.log(chalk.gray(`sudo ${networkManager.getSudoSetupScriptPath()} install`));
        process.exit(1);
      }
      
      // 如果未提供所有参数，则进入交互模式
      if (!options.ip || !options.netmask) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'ip',
            message: 'IP地址:',
            default: options.ip,
            validate: (input) => networkManager.isValidIP(input) ? true : '请输入有效的IP地址'
          },
          {
            type: 'input',
            name: 'netmask',
            message: '子网掩码:',
            default: options.netmask || '255.255.255.0',
            validate: (input) => {
              try {
                networkManager.netmaskToCIDR(input);
                return true;
              } catch (error) {
                return '请输入有效的子网掩码';
              }
            }
          },
          {
            type: 'input',
            name: 'gateway',
            message: '网关地址:',
            default: options.gateway,
            validate: (input) => !input || networkManager.isValidIP(input) ? true : '请输入有效的IP地址'
          },
          {
            type: 'input',
            name: 'dns',
            message: 'DNS服务器地址（逗号分隔多个地址）:',
            default: options.dns,
            validate: (input) => {
              if (!input) return true;
              const dnsServers = input.split(',').map(s => s.trim());
              for (const dns of dnsServers) {
                if (!networkManager.isValidIP(dns)) {
                  return `${dns} 不是有效的IP地址`;
                }
              }
              return true;
            }
          }
        ]);
        
        // 合并命令行参数和交互式输入
        options = { ...options, ...answers };
      }
      
      // 解析DNS服务器地址
      let dnsServers = [];
      if (options.dns) {
        dnsServers = options.dns.split(',').map(s => s.trim());
      }
      
      // 配置网络接口
      const config = {
        ip: options.ip,
        netmask: options.netmask,
        gateway: options.gateway,
        dns: dnsServers
      };
      
      console.log(chalk.yellow('\n即将应用以下配置:'));
      console.log(JSON.stringify(config, null, 2));
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '确认应用此配置?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('操作已取消'));
        process.exit(0);
      }
      
      await networkManager.updateNetworkConfig(interfaceName, config);
      console.log(chalk.green(`接口 ${interfaceName} 已配置为静态IP`));
    } catch (error) {
      console.error(chalk.red(`配置接口失败: ${error.message}`));
      process.exit(1);
    }
  });

// 配置DHCP命令
program
  .command('set-dhcp <interface>')
  .description('配置网络接口为DHCP模式')
  .action(async (interfaceName) => {
    try {
      // 检查管理员权限
      const hasAdminPermissions = await networkManager.checkAdminPermissions();
      
      if (!hasAdminPermissions) {
        console.error(chalk.red('需要管理员权限才能配置网络接口'));
        console.log(chalk.yellow('请使用以下命令配置sudo权限:'));
        console.log(chalk.gray(`sudo ${networkManager.getSudoSetupScriptPath()} install`));
        process.exit(1);
      }
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `确认将接口 ${interfaceName} 配置为DHCP模式?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('操作已取消'));
        process.exit(0);
      }
      
      await networkManager.setDHCP(interfaceName);
      console.log(chalk.green(`接口 ${interfaceName} 已配置为DHCP模式`));
    } catch (error) {
      console.error(chalk.red(`配置接口失败: ${error.message}`));
      process.exit(1);
    }
  });

// 重启网络服务命令
program
  .command('restart')
  .description('重启网络服务')
  .action(async () => {
    try {
      // 检查管理员权限
      const hasAdminPermissions = await networkManager.checkAdminPermissions();
      
      if (!hasAdminPermissions) {
        console.error(chalk.red('需要管理员权限才能重启网络服务'));
        console.log(chalk.yellow('请使用以下命令配置sudo权限:'));
        console.log(chalk.gray(`sudo ${networkManager.getSudoSetupScriptPath()} install`));
        process.exit(1);
      }
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: '确认重启网络服务?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.yellow('操作已取消'));
        process.exit(0);
      }
      
      await networkManager.restartNetworkService();
      console.log(chalk.green('网络服务已重启'));
    } catch (error) {
      console.error(chalk.red(`重启网络服务失败: ${error.message}`));
      process.exit(1);
    }
  });

// 配置sudo权限命令
program
  .command('setup-sudo')
  .description('配置sudo权限')
  .action(async () => {
    try {
      const scriptPath = networkManager.getSudoSetupScriptPath();
      
      console.log(chalk.yellow('请使用以下命令配置sudo权限:'));
      console.log(chalk.gray(`sudo ${scriptPath} install`));
      
      console.log(chalk.yellow('\n要卸载sudo权限配置，请使用:'));
      console.log(chalk.gray(`sudo ${scriptPath} uninstall`));
    } catch (error) {
      console.error(chalk.red(`获取sudo配置脚本路径失败: ${error.message}`));
      process.exit(1);
    }
  });

// 解析命令行参数
program.parse(process.argv);

// 如果没有提供命令，则显示帮助信息
if (!process.argv.slice(2).length) {
  program.outputHelp();
}