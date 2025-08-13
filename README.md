# network-config-manager

跨平台网络配置管理工具，支持Linux、macOS和Windows系统。

## 功能特点

- 获取网络接口列表和详细信息
- 配置网络接口的IP地址、子网掩码、网关和DNS
- 支持静态IP和DHCP配置
- 跨平台支持（Linux、macOS和Windows）
- 权限管理和提升
- 网络服务重启

## 安装

```bash
npm install network-config-manager
```

## 基本用法

```javascript
const { NetworkManager } = require('network-config-manager');

// 创建NetworkManager实例
const networkManager = new NetworkManager();

// 获取网络接口列表
async function listInterfaces() {
  try {
    const interfaces = await networkManager.getNetworkInterfaces();
    console.log('网络接口列表:', interfaces);
  } catch (error) {
    console.error('获取网络接口列表失败:', error.message);
  }
}

// 获取特定接口的详细信息
async function getInterfaceDetails(interfaceName) {
  try {
    const details = await networkManager.getInterfaceDetails(interfaceName);
    console.log(`接口 ${interfaceName} 的详细信息:`, details);
  } catch (error) {
    console.error(`获取接口 ${interfaceName} 详细信息失败:`, error.message);
  }
}

// 配置静态IP
async function configureStaticIP(interfaceName, ipConfig) {
  try {
    // 检查管理员权限
    const hasAdminPermissions = await networkManager.checkAdminPermissions();
    if (!hasAdminPermissions) {
      console.error('需要管理员权限才能配置网络接口');
      return;
    }
    
    // 配置静态IP
    await networkManager.updateNetworkConfig(interfaceName, ipConfig);
    console.log(`接口 ${interfaceName} 已配置为静态IP`);
  } catch (error) {
    console.error(`配置接口 ${interfaceName} 失败:`, error.message);
  }
}

// 配置DHCP
async function configureDHCP(interfaceName) {
  try {
    // 检查管理员权限
    const hasAdminPermissions = await networkManager.checkAdminPermissions();
    if (!hasAdminPermissions) {
      console.error('需要管理员权限才能配置网络接口');
      return;
    }
    
    // 配置DHCP
    await networkManager.setDHCP(interfaceName);
    console.log(`接口 ${interfaceName} 已配置为DHCP`);
  } catch (error) {
    console.error(`配置接口 ${interfaceName} 失败:`, error.message);
  }
}

// 重启网络服务
async function restartNetwork() {
  try {
    // 检查管理员权限
    const hasAdminPermissions = await networkManager.checkAdminPermissions();
    if (!hasAdminPermissions) {
      console.error('需要管理员权限才能重启网络服务');
      return;
    }
    
    // 重启网络服务
    await networkManager.restartNetworkService();
    console.log('网络服务已重启');
  } catch (error) {
    console.error('重启网络服务失败:', error.message);
  }
}

// 调用示例
listInterfaces();
```

## API参考

### NetworkManager类

#### 构造函数

```javascript
const networkManager = new NetworkManager();
```

#### 方法

##### getNetworkInterfaces()

获取网络接口列表。

```javascript
const interfaces = await networkManager.getNetworkInterfaces();
```

返回值：Promise，解析为网络接口对象数组。

##### getInterfaceDetails(interfaceName)

获取特定网络接口的详细信息。

```javascript
const details = await networkManager.getInterfaceDetails('eth0');
```

参数：
- `interfaceName` (String): 网络接口名称

返回值：Promise，解析为包含接口详细信息的对象。

##### updateNetworkConfig(interfaceName, config)

更新网络接口配置（静态IP）。

```javascript
await networkManager.updateNetworkConfig('eth0', {
  ip: '192.168.1.100',
  netmask: '255.255.255.0',
  gateway: '192.168.1.1',
  dns: ['8.8.8.8', '8.8.4.4']
});
```

参数：
- `interfaceName` (String): 网络接口名称
- `config` (Object): 网络配置对象
  - `ip` (String): IP地址
  - `netmask` (String): 子网掩码
  - `gateway` (String, 可选): 网关地址
  - `dns` (Array, 可选): DNS服务器地址数组

返回值：Promise，成功时解析为true。

##### setDHCP(interfaceName)

将网络接口配置为DHCP模式。

```javascript
await networkManager.setDHCP('eth0');
```

参数：
- `interfaceName` (String): 网络接口名称

返回值：Promise，成功时解析为true。

##### restartNetworkService()

重启网络服务。

```javascript
await networkManager.restartNetworkService();
```

返回值：Promise，成功时解析为true。

##### checkAdminPermissions()

检查当前用户是否具有管理员权限。

```javascript
const hasAdminPermissions = await networkManager.checkAdminPermissions();
```

返回值：Promise，如果用户具有管理员权限，则解析为true，否则为false。

##### isValidIP(ip)

验证IP地址是否有效。

```javascript
const isValid = networkManager.isValidIP('192.168.1.100');
```

参数：
- `ip` (String): 要验证的IP地址

返回值：Boolean，如果IP地址有效，则为true，否则为false。

##### netmaskToCIDR(netmask)

将子网掩码转换为CIDR表示法。

```javascript
const cidr = networkManager.netmaskToCIDR('255.255.255.0'); // 返回 24
```

参数：
- `netmask` (String): 子网掩码

返回值：Number，CIDR前缀长度。

## 权限管理

在Linux和macOS系统上，配置网络接口需要管理员权限。NetworkManager提供了权限检查和提升功能。

```javascript
// 检查管理员权限
const hasAdminPermissions = await networkManager.checkAdminPermissions();

if (!hasAdminPermissions) {
  console.log('需要管理员权限才能配置网络接口');
  console.log('请使用以下命令配置sudo权限:');
  console.log(`sudo ${networkManager.getSudoSetupScriptPath()} install`);
}
```

### 自动配置sudo权限

NetworkManager提供了自动配置sudo权限的方法：

```javascript
// 配置sudo权限（需要提供管理员密码）
const password = '您的管理员密码';
const success = await networkManager.setupSudoPermissions(password);

if (success) {
  console.log('sudo权限配置成功');
} else {
  console.log('sudo权限配置失败');
}
```

### 最新改进

最新版本解决了以下sudo权限配置问题：

- **用户识别修复** - 解决了sudo执行环境下无法正确识别原始用户的问题
- **环境变量传递** - 确保SUDO_USER环境变量正确传递，避免权限配置错误
- **PM2环境支持** - 优化了在PM2等守护进程环境下的权限配置

### 特殊环境说明

在PM2等守护进程环境下使用时，建议：

1. 预先配置sudo权限（推荐）
   ```bash
   sudo /path/to/setup-sudo.sh install
   ```

2. 使用改进的spawn方式处理密码传递
   ```javascript
   // 请参考demo目录下的server-fixed.js示例
   ```

## 平台支持

- **Linux**: 使用ip、ifconfig和systemctl命令
- **macOS**: 使用networksetup和ifconfig命令
- **Windows**: 使用netsh命令

## 许可证

MIT