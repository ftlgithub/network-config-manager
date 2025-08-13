#!/bin/bash

# 网络配置权限管理脚本
# 用于配置无密码sudo权限，以便执行网络配置操作

# 显示帮助信息
show_help() {
  echo "网络配置权限管理脚本"
  echo "用法: $0 <命令>"
  echo ""
  echo "命令:"
  echo "  install    安装sudo权限配置"
  echo "  uninstall  卸载sudo权限配置"
  echo "  help       显示帮助信息"
  echo ""
  echo "说明:"
  echo "  此脚本用于配置无密码sudo权限，以便执行网络配置操作。"
  echo "  安装后，可以无需输入密码执行netconfig.sh脚本。"
}

# 检测操作系统类型
detect_os() {
  if [[ "$(uname)" == "Darwin" ]]; then
    echo "macos"
  elif [[ "$(uname)" == "Linux" ]]; then
    echo "linux"
  else
    echo "unsupported"
  fi
}

# 获取脚本目录的绝对路径
get_script_dir() {
  local script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "$script_path"
}

# 安装sudo权限配置
install_sudo_config() {
  local script_dir=$(get_script_dir)
  local netconfig_script="$script_dir/netconfig.sh"
  
  # 确保netconfig.sh脚本存在
  if [[ ! -f "$netconfig_script" ]]; then
    echo "错误: netconfig.sh脚本不存在于 $script_dir"
    exit 1
  fi
  
  # 确保脚本有执行权限
  chmod +x "$netconfig_script"
  chmod +x "$0"
  
  # 获取当前用户（优先使用SUDO_USER环境变量）
  local current_user
  if [[ -n "$SUDO_USER" ]]; then
    current_user="$SUDO_USER"
  else
    current_user=$(whoami)
  fi
  echo "配置sudo权限用户: $current_user"
  
  # 创建sudoers配置文件
  local sudoers_file="/etc/sudoers.d/network-config"
  local temp_file="/tmp/network-config-sudoers"
  
  echo "# 网络配置管理工具sudo权限配置" > "$temp_file"
  echo "# 创建时间: $(date)" >> "$temp_file"
  echo "" >> "$temp_file"
  echo "# 允许无密码执行netconfig.sh脚本" >> "$temp_file"
  echo "$current_user ALL=(ALL) NOPASSWD: $netconfig_script" >> "$temp_file"
  
  # 验证sudoers语法
  visudo -c -f "$temp_file"
  if [[ $? -ne 0 ]]; then
    echo "错误: sudoers配置文件语法错误"
    rm -f "$temp_file"
    exit 1
  fi
  
  # 安装sudoers配置文件
  sudo cp "$temp_file" "$sudoers_file"
  sudo chmod 440 "$sudoers_file"
  rm -f "$temp_file"
  
  echo "sudo权限配置已安装"
  echo "现在可以无密码执行以下命令:"
  echo "  sudo $netconfig_script <命令> [参数...]"
  
  # 验证配置是否生效
  echo "\n正在验证配置..."
  sudo -n "$netconfig_script" help >/dev/null 2>&1
  if [[ $? -eq 0 ]]; then
    echo "✅ 配置验证成功！可以无密码执行netconfig.sh脚本。"
  else
    echo "❌ 配置验证失败。请检查sudoers配置。"
  fi
}

# 卸载sudo权限配置
uninstall_sudo_config() {
  local sudoers_file="/etc/sudoers.d/network-config"
  
  if [[ -f "$sudoers_file" ]]; then
    sudo rm -f "$sudoers_file"
    echo "sudo权限配置已卸载"
  else
    echo "未找到sudo权限配置文件"
  fi
}

# 主函数
main() {
  # 检查参数
  if [[ $# -lt 1 ]]; then
    show_help
    exit 1
  fi
  
  # 获取操作系统类型
  OS_TYPE=$(detect_os)
  
  if [[ "$OS_TYPE" == "unsupported" ]]; then
    echo "错误: 不支持的操作系统"
    exit 1
  fi
  
  if [[ "$OS_TYPE" == "win32" ]]; then
    echo "错误: Windows系统不支持sudo配置"
    exit 1
  fi
  
  # 解析命令
  COMMAND=$1
  
  case "$COMMAND" in
    install)
      install_sudo_config
      ;;
    uninstall)
      uninstall_sudo_config
      ;;
    help)
      show_help
      ;;
    *)
      echo "错误: 未知命令 '$COMMAND'"
      show_help
      exit 1
      ;;
  esac
}

# 执行主函数
main "$@"