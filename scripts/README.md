# 网络配置脚本权限管理系统

本目录包含用于Linux和macOS系统的网络配置权限管理脚本，旨在解决网络配置时需要管理员权限的问题。

## 文件说明

### 1. netconfig.sh
网络配置执行脚本，包含所有需要管理员权限的网络配置命令。

**功能特性：**
- 设置静态IP配置
- 设置DHCP模式
- 重启网络服务
- 刷新DNS缓存
- 显示网络接口和路由信息
- 跨平台支持（Linux/macOS）
- 详细的日志记录
- 参数验证和错误处理

### 2. setup-sudo.sh
sudoers权限配置安装脚本，用于设置无密码sudo执行权限。

**功能特性：**
- 自动检测操作系统
- 创建安全的sudoers配置
- 配置验证和测试
- 安装/卸载功能
- 详细的使用说明

## 快速开始

### 第一步：安装权限配置

```bash
# 进入项目根目录
cd /path/to/network-config

# 运行权限配置安装脚本
sudo ./scripts/setup-sudo.sh install
```

### 第二步：测试配置

```bash
# 测试是否可以无密码执行网络配置脚本
sudo ./scripts/netconfig.sh help
```

如果配置成功，您应该能够看到帮助信息而无需输入密码。

### 第三步：使用网络配置功能

现在您可以在应用程序中使用网络配置功能，无需每次都输入管理员密码。

## 详细使用说明

### netconfig.sh 命令参考

#### 设置静态IP
```bash
sudo ./scripts/netconfig.sh set-ip <interface> <ip> <netmask> [gateway] [dns1,dns2,...]
```

**示例：**
```bash
# Linux
sudo ./scripts/netconfig.sh set-ip eth0 192.168.1.100 255.255.255.0 192.168.1.1 8.8.8.8,8.8.4.4

# macOS
sudo ./scripts/netconfig.sh set-ip en0 192.168.1.100 255.255.255.0 192.168.1.1 8.8.8.8,8.8.4.4
```

#### 设置DHCP模式
```bash
sudo ./scripts/netconfig.sh set-dhcp <interface>
```

**示例：**
```bash
# Linux
sudo ./scripts/netconfig.sh set-dhcp eth0

# macOS
sudo ./scripts/netconfig.sh set-dhcp en0
```

#### 重启网络服务
```bash
sudo ./scripts/netconfig.sh restart-network
```

#### 刷新DNS缓存
```bash
sudo ./scripts/netconfig.sh flush-dns
```

#### 显示网络信息
```bash
# 显示所有网络接口
sudo ./scripts/netconfig.sh show-interfaces

# 显示路由表
sudo ./scripts/netconfig.sh show-routes

# 显示帮助信息
sudo ./scripts/netconfig.sh help
```

### setup-sudo.sh 命令参考

#### 安装权限配置
```bash
sudo ./scripts/setup-sudo.sh install
```

#### 卸载权限配置
```bash
sudo ./scripts/setup-sudo.sh uninstall
```

#### 测试当前配置
```bash
sudo ./scripts/setup-sudo.sh test
```

#### 显示帮助信息
```bash
./scripts/setup-sudo.sh help
```

## 安全考虑

### 最小权限原则
- 仅对特定的网络配置脚本授予无密码sudo权限
- 避免使用 `NOPASSWD: ALL` 这样的广泛权限
- 脚本路径固定，防止权限滥用

### 配置文件位置
- sudoers配置文件：`/etc/sudoers.d/netconfig`
- 使用独立的配置文件，不修改主sudoers文件
- 配置文件权限：440 (只读)

### 定期检查
建议定期检查sudoers配置：
```bash
# 查看当前配置
sudo cat /etc/sudoers.d/netconfig

# 验证配置语法
sudo visudo -c -f /etc/sudoers.d/netconfig
```

## 故障排除

### 常见问题

#### 1. 权限配置失败
**症状：** 运行 `setup-sudo.sh` 时出现错误

**解决方案：**
```bash
# 检查是否有root权限
whoami

# 确保使用sudo运行
sudo ./scripts/setup-sudo.sh install

# 检查脚本权限
ls -la scripts/setup-sudo.sh
chmod +x scripts/setup-sudo.sh
```

#### 2. 仍然需要输入密码
**症状：** 配置后仍然提示输入密码

**解决方案：**
```bash
# 检查sudoers配置
sudo cat /etc/sudoers.d/netconfig

# 重新测试配置
sudo ./scripts/setup-sudo.sh test

# 重新登录或重启终端
```

#### 3. 脚本执行失败
**症状：** netconfig.sh 执行时出现错误

**解决方案：**
```bash
# 检查脚本权限
ls -la scripts/netconfig.sh
chmod +x scripts/netconfig.sh

# 检查系统兼容性
uname -s

# 查看详细错误信息
sudo ./scripts/netconfig.sh help
```

### 日志查看

脚本执行日志会输出到终端，包含：
- 操作时间戳
- 执行的命令
- 成功/失败状态
- 错误详情

## 卸载说明

如果需要完全移除权限配置：

```bash
# 卸载sudoers配置
sudo ./scripts/setup-sudo.sh uninstall

# 验证配置已删除
ls -la /etc/sudoers.d/netconfig
```

## 支持的操作系统

- **Linux**: Ubuntu, CentOS, RHEL, Debian 等主流发行版
- **macOS**: 10.12+ (Sierra及更高版本)

## 注意事项

1. **脚本位置**: 请勿移动或重命名 `netconfig.sh` 脚本，否则需要重新配置权限
2. **系统更新**: 系统更新后可能需要重新验证权限配置
3. **用户切换**: 如果切换用户，需要为新用户重新配置权限
4. **备份**: 建议在修改网络配置前备份当前配置

## 技术支持

如果遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查脚本执行日志
3. 验证操作系统兼容性
4. 确认权限配置正确性

---

**最后更新**: $(date)
**版本**: 1.0.0