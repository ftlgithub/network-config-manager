const { exec, spawn } = require('child_process');
const os = require('os');
const util = require('util');
const path = require('path');

const execAsync = util.promisify(exec);

class NetworkManager {
  constructor() {
    this.platform = os.platform();
    // 设置netconfig脚本路径
    this.netconfigScript = path.join(__dirname, '..', 'scripts', 'netconfig.sh');
  }

  /**
   * 获取系统所有网卡信息
   * @returns {Promise<Array>} 网卡信息数组
   */
  async getNetworkInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = [];

      for (const [name, addresses] of Object.entries(interfaces)) {
        // 过滤掉回环接口和内部接口
        const validAddresses = addresses.filter(addr => 
          !addr.internal && addr.family === 'IPv4'
        );

        if (validAddresses.length > 0) {
          const addr = validAddresses[0];
          const interfaceInfo = {
            name,
            ip: addr.address,
            netmask: addr.netmask,
            mac: addr.mac,
            family: addr.family
          };

          // 获取网关和DNS信息
          const additionalInfo = await this.getInterfaceDetails(name);
          Object.assign(interfaceInfo, additionalInfo);
          
          result.push(interfaceInfo);
        }
      }

      return result;
    } catch (error) {
      throw new Error(`获取网卡信息失败: ${error.message}`);
    }
  }

  /**
   * 获取指定网卡的详细信息
   * @param {string} interfaceName 网卡名称
   * @returns {Promise<Object>} 网卡详细信息
   */
  async getInterfaceDetails(interfaceName) {
    try {
      switch (this.platform) {
        case 'linux':
          return await this.getLinuxInterfaceDetails(interfaceName);
        case 'darwin': // macOS
          return await this.getMacOSInterfaceDetails(interfaceName);
        case 'win32': // Windows
          return await this.getWindowsInterfaceDetails(interfaceName);
        default:
          throw new Error(`不支持的操作系统: ${this.platform}`);
      }
    } catch (error) {
      console.warn(`获取网卡 ${interfaceName} 详细信息失败:`, error.message);
      return { gateway: 'N/A', dns: [] };
    }
  }

  /**
   * Linux系统获取网卡详细信息
   */
  async getLinuxInterfaceDetails(interfaceName) {
    const gateway = await this.getLinuxGateway(interfaceName);
    const dns = await this.getLinuxDNS();
    return { gateway, dns };
  }

  /**
   * macOS系统获取网卡详细信息
   */
  async getMacOSInterfaceDetails(interfaceName) {
    const gateway = await this.getMacOSGateway(interfaceName);
    const dns = await this.getMacOSDNS();
    return { gateway, dns };
  }

  /**
   * Windows系统获取网卡详细信息
   */
  async getWindowsInterfaceDetails(interfaceName) {
    const gateway = await this.getWindowsGateway(interfaceName);
    const dns = await this.getWindowsDNS(interfaceName);
    return { gateway, dns };
  }

  /**
   * 获取Linux网关
   */
  async getLinuxGateway(interfaceName) {
    try {
      const { stdout } = await execAsync(`ip route show dev ${interfaceName} | grep default`);
      const match = stdout.match(/default via ([\d.]+)/);
      return match ? match[1] : 'N/A';
    } catch {
      return 'N/A';
    }
  }

  /**
   * 获取macOS网关
   */
  async getMacOSGateway(interfaceName) {
    try {
      // 尝试多种方法获取网关
      try {
        // 方法1: 使用netstat命令获取路由表
        const { stdout: netstatOutput } = await execAsync('netstat -nr');
        const lines = netstatOutput.split('\n');
        
        // 查找默认路由行
        for (const line of lines) {
          // 匹配默认路由行，格式通常为: default  192.168.1.1  UGSc  en0
          if (line.trim().startsWith('default')) {
            const parts = line.trim().split(/\s+/);
            // 检查是否包含接口名称
            if (parts.length >= 4) {
              const gateway = parts[1];
              const iface = parts[parts.length - 1];
              
              // 如果指定了接口名称，检查是否匹配
              if (!interfaceName || iface === interfaceName) {
                // 验证IP格式
                if (this.isValidIP(gateway)) {
                  return gateway;
                }
              }
            }
          }
        }
      } catch (netstatError) {
        // 忽略错误，尝试下一种方法
      }
      
      // 方法2: 使用route命令获取默认网关
      try {
        const { stdout } = await execAsync('route -n get default');
        
        // 检查是否匹配指定的接口
        if (interfaceName && !stdout.includes(`interface: ${interfaceName}`)) {
          // 不匹配，继续尝试其他方法
        } else {
          // 使用正则表达式提取网关地址
          const gatewayMatch = stdout.match(/gateway: (\S+)/);
          if (gatewayMatch && this.isValidIP(gatewayMatch[1])) {
            return gatewayMatch[1];
          }
        }
      } catch (routeError) {
        // 忽略错误，尝试下一种方法
      }
      
      // 方法3: 使用networksetup命令获取网关
      if (interfaceName) {
        try {
          // 首先获取网络服务名称
          const { stdout: serviceOutput } = await execAsync(`networksetup -listnetworkserviceorder | grep ${interfaceName}`);
          const serviceMatch = serviceOutput.match(/\(Hardware Port: ([^,]+),/);
          
          if (serviceMatch) {
            const serviceName = serviceMatch[1];
            
            // 获取服务信息
            const { stdout: infoOutput } = await execAsync(`networksetup -getinfo "${serviceName}"`);
            const routerMatch = infoOutput.match(/Router: (\S+)/);
            
            if (routerMatch && this.isValidIP(routerMatch[1])) {
              return routerMatch[1];
            }
          }
        } catch (networksetupError) {
          // 忽略错误
        }
      }
      
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * 获取Windows网关
   */
  async getWindowsGateway(interfaceName) {
    try {
      const { stdout } = await execAsync(`netsh interface ip show config "${interfaceName}"`);
      const match = stdout.match(/Default Gateway:\s*([\d.]+)/);
      return match ? match[1] : 'N/A';
    } catch {
      return 'N/A';
    }
  }

  /**
   * 获取Linux DNS
   */
  async getLinuxDNS() {
    try {
      const { stdout } = await execAsync('cat /etc/resolv.conf | grep nameserver');
      return stdout.split('\n')
        .filter(line => line.includes('nameserver'))
        .map(line => line.split(' ')[1])
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * 获取macOS DNS
   */
  async getMacOSDNS() {
    try {
      const { stdout } = await execAsync('scutil --dns | grep nameserver');
      return stdout.split('\n')
        .filter(line => line.includes('nameserver'))
        .map(line => line.split(': ')[1])
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  /**
   * 获取Windows DNS
   */
  async getWindowsDNS(interfaceName) {
    try {
      const { stdout } = await execAsync(`netsh interface ip show config "${interfaceName}"`);
      const dnsMatches = stdout.match(/DNS servers configured through DHCP:\s*([\d.\s]+)/)
        || stdout.match(/Statically Configured DNS Servers:\s*([\d.\s]+)/);
      
      if (dnsMatches) {
        return dnsMatches[1].trim().split(/\s+/).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * 检查是否有管理员权限
   * @returns {Promise<boolean>} 是否有管理员权限
   */
  async checkAdminPrivileges() {
    try {
      switch (this.platform) {
        case 'win32':
          // Windows: 尝试执行需要管理员权限的命令
          await execAsync('net session', { timeout: 5000 });
          return true;
        case 'linux':
        case 'darwin':
          // Linux/macOS: 检查是否可以无密码执行netconfig.sh脚本
          try {
            await execAsync(`sudo -n ${this.netconfigScript} help`, { timeout: 5000 });
            return true;
          } catch (scriptError) {
            // 如果netconfig.sh无法无密码执行，尝试通用sudo检查
            await execAsync('sudo -n true', { timeout: 5000 });
            return true;
          }
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 检查管理员权限（用于API调用）
   * @returns {Promise<boolean>} 是否具有管理员权限
   */
  async checkAdminPermissions() {
    return await this.checkAdminPrivileges();
  }

  /**
   * 配置sudo权限（用于API调用）
   * @param {string} password 管理员密码
   * @returns {Promise<boolean>} 是否配置成功
   */
  async setupSudoPermissions(password) {
    try {
      if (this.platform === 'win32') {
        // Windows不需要sudo配置
        return true;
      }

      // 构建setup-sudo.sh脚本路径
      const setupScript = path.join(__dirname, '..', 'scripts', 'setup-sudo.sh');
      
      // 使用密码执行setup-sudo.sh脚本
      const command = `echo '${password}' | sudo -S ${setupScript} install`;
      
      await execAsync(command, { timeout: 30000 });
      
      // 验证配置是否成功
      const isConfigured = await this.checkAdminPrivileges();
      return isConfigured;
      
    } catch (error) {
      console.error('配置sudo权限失败:', error);
      return false;
    }
  }

  /**
   * 获取权限提示信息
   * @returns {string} 权限提示信息
   */
  getPermissionInstructions() {
    switch (this.platform) {
      case 'win32':
        return '请以管理员身份运行命令提示符或PowerShell，然后重新执行程序。';
      case 'linux':
      case 'darwin':
        return '请运行以下命令设置无密码sudo权限：\nsudo ./scripts/setup-sudo.sh install\n\n或者使用 sudo 运行程序：sudo node index.js';
      default:
        return '需要管理员权限才能修改网络配置。';
    }
  }

  /**
   * 修改网卡配置（带权限检查）
   * @param {string} interfaceName 网卡名称
   * @param {Object} config 配置信息
   * @param {string} config.ip IP地址
   * @param {string} config.netmask 子网掩码
   * @param {string} config.gateway 网关
   * @param {Array<string>} config.dns DNS服务器列表
   * @param {boolean} skipPermissionCheck 是否跳过权限检查（默认false）
   * @returns {Promise<boolean>} 是否成功
   */
  async updateNetworkConfig(interfaceName, config, skipPermissionCheck = false) {
    try {
      // 权限检查
      if (!skipPermissionCheck) {
        const hasPermission = await this.checkAdminPrivileges();
        if (!hasPermission) {
          throw new Error(`权限不足。${this.getPermissionInstructions()}`);
        }
      }

      switch (this.platform) {
        case 'linux':
          return await this.updateLinuxConfig(interfaceName, config);
        case 'darwin':
          return await this.updateMacOSConfig(interfaceName, config);
        case 'win32':
          return await this.updateWindowsConfig(interfaceName, config);
        default:
          throw new Error(`不支持的操作系统: ${this.platform}`);
      }
    } catch (error) {
      throw new Error(`更新网卡配置失败: ${error.message}`);
    }
  }

  /**
   * 更新Linux网卡配置
   */
  async updateLinuxConfig(interfaceName, config) {
    const { ip, netmask, gateway, dns } = config;
    
    // 使用netconfig.sh脚本设置静态IP配置
    const dnsServers = dns && dns.length > 0 ? dns.join(',') : '';
    const command = `sudo ${this.netconfigScript} set-ip ${interfaceName} ${ip} ${netmask} ${gateway || ''} ${dnsServers}`;
    
    await execAsync(command);
    return true;
  }

  /**
   * 更新macOS网卡配置
   */
  async updateMacOSConfig(interfaceName, config) {
    const { ip, netmask, gateway, dns } = config;
    
    try {
      // 使用netconfig.sh脚本设置静态IP配置
      const dnsServers = dns && dns.length > 0 ? dns.join(',') : '';
      const command = `sudo ${this.netconfigScript} set-ip ${interfaceName} ${ip} ${netmask} ${gateway || ''} ${dnsServers}`;
      
      const { stdout, stderr } = await execAsync(command);
      
      // 验证网关设置是否成功
      if (gateway) {
        const currentGateway = await this.getMacOSGateway(interfaceName);
        
        if (currentGateway === 'N/A' || currentGateway !== gateway) {
          // 尝试使用route命令手动设置网关
          try {
            await execAsync(`sudo route delete default >/dev/null 2>&1 || true`);
            await execAsync(`sudo route add default ${gateway}`);
          } catch (error) {
            console.error(`手动设置网关失败: ${error.message}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 设置网卡为DHCP模式
   * @param {string} interfaceName 网卡名称
   * @param {boolean} skipPermissionCheck 是否跳过权限检查（默认false）
   * @returns {Promise<boolean>} 是否成功
   */
  async setDHCP(interfaceName, skipPermissionCheck = false) {
    try {
      // 权限检查
      if (!skipPermissionCheck) {
        const hasPermission = await this.checkAdminPrivileges();
        if (!hasPermission) {
          throw new Error(`权限不足。${this.getPermissionInstructions()}`);
        }
      }

      switch (this.platform) {
        case 'linux':
        case 'darwin':
          // 使用netconfig.sh脚本设置DHCP
          await execAsync(`sudo ${this.netconfigScript} set-dhcp ${interfaceName}`);
          return true;
        case 'win32':
          // Windows DHCP设置
          await execAsync(`netsh interface ip set address "${interfaceName}" dhcp`);
          await execAsync(`netsh interface ip set dns "${interfaceName}" dhcp`);
          return true;
        default:
          throw new Error(`不支持的操作系统: ${this.platform}`);
      }
    } catch (error) {
      throw new Error(`设置DHCP失败: ${error.message}`);
    }
  }

  /**
   * 重启网络服务
   * @param {boolean} skipPermissionCheck 是否跳过权限检查（默认false）
   * @returns {Promise<boolean>} 是否成功
   */
  async restartNetwork(skipPermissionCheck = false) {
    try {
      // 权限检查
      if (!skipPermissionCheck) {
        const hasPermission = await this.checkAdminPrivileges();
        if (!hasPermission) {
          throw new Error(`权限不足。${this.getPermissionInstructions()}`);
        }
      }

      switch (this.platform) {
        case 'linux':
        case 'darwin':
          // 使用netconfig.sh脚本重启网络
          await execAsync(`sudo ${this.netconfigScript} restart-network`);
          return true;
        case 'win32':
          // Windows网络重启
          await execAsync('ipconfig /release');
          await execAsync('ipconfig /renew');
          await execAsync('ipconfig /flushdns');
          return true;
        default:
          throw new Error(`不支持的操作系统: ${this.platform}`);
      }
    } catch (error) {
      throw new Error(`重启网络失败: ${error.message}`);
    }
  }

  /**
   * 更新Windows网卡配置
   */
  async updateWindowsConfig(interfaceName, config) {
    const { ip, netmask, gateway, dns } = config;
    
    // 设置IP、子网掩码和网关
    let cmd = `netsh interface ip set address "${interfaceName}" static ${ip} ${netmask}`;
    if (gateway && gateway !== 'N/A') {
      cmd += ` ${gateway}`;
    }
    await execAsync(cmd);
    
    // 设置DNS
    if (dns && dns.length > 0) {
      await execAsync(`netsh interface ip set dns "${interfaceName}" static ${dns[0]}`);
      for (let i = 1; i < dns.length; i++) {
        await execAsync(`netsh interface ip add dns "${interfaceName}" ${dns[i]} index=${i + 1}`);
      }
    }
    
    return true;
  }

  /**
   * 将子网掩码转换为CIDR格式
   * @param {string} netmask 子网掩码
   * @returns {number} CIDR值
   */
  netmaskToCIDR(netmask) {
    const parts = netmask.split('.');
    let cidr = 0;
    
    for (const part of parts) {
      const num = parseInt(part);
      cidr += (num >>> 0).toString(2).split('1').length - 1;
    }
    
    return cidr;
  }

  /**
   * 验证IP地址格式
   * @param {string} ip IP地址
   * @returns {boolean} 是否有效
   */
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }
}

module.exports = NetworkManager;