/**
 * 权限检查工具
 * 用于检查当前用户是否具有管理员权限
 */

const { exec } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

/**
 * 检查当前用户是否具有管理员权限
 * @returns {Promise<boolean>} 如果用户具有管理员权限，则返回true，否则返回false
 */
function checkAdminPermissions() {
  return new Promise((resolve) => {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows系统使用net session命令检查管理员权限
      exec('net session', (error) => {
        resolve(error ? false : true);
      });
    } else if (platform === 'darwin' || platform === 'linux') {
      // macOS和Linux系统使用sudo -n true命令检查sudo权限
      exec('sudo -n true', (error) => {
        resolve(error ? false : true);
      });
    } else {
      // 不支持的平台
      resolve(false);
    }
  });
}

/**
 * 获取sudo配置脚本的路径
 * @returns {string} sudo配置脚本的绝对路径
 */
function getSudoSetupScriptPath() {
  // 获取当前模块所在目录
  const moduleDir = path.dirname(require.resolve('./check-permissions'));
  // 计算scripts目录的路径
  const scriptsDir = path.join(moduleDir, '..', 'scripts');
  // 返回setup-sudo.sh脚本的路径
  return path.join(scriptsDir, 'setup-sudo.sh');
}

/**
 * 获取网络配置脚本的路径
 * @returns {string} 网络配置脚本的绝对路径
 */
function getNetconfigScriptPath() {
  // 获取当前模块所在目录
  const moduleDir = path.dirname(require.resolve('./check-permissions'));
  // 计算scripts目录的路径
  const scriptsDir = path.join(moduleDir, '..', 'scripts');
  // 返回netconfig.sh脚本的路径
  return path.join(scriptsDir, 'netconfig.sh');
}

/**
 * 检查sudo配置脚本是否存在
 * @returns {boolean} 如果sudo配置脚本存在，则返回true，否则返回false
 */
function checkSudoSetupScriptExists() {
  try {
    const scriptPath = getSudoSetupScriptPath();
    return fs.existsSync(scriptPath);
  } catch (error) {
    return false;
  }
}

/**
 * 检查网络配置脚本是否存在
 * @returns {boolean} 如果网络配置脚本存在，则返回true，否则返回false
 */
function checkNetconfigScriptExists() {
  try {
    const scriptPath = getNetconfigScriptPath();
    return fs.existsSync(scriptPath);
  } catch (error) {
    return false;
  }
}

/**
 * 确保脚本具有执行权限
 * @param {string} scriptPath 脚本路径
 * @returns {Promise<boolean>} 如果设置成功，则返回true，否则返回false
 */
function ensureExecutablePermission(scriptPath) {
  return new Promise((resolve) => {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // Windows系统不需要设置执行权限
      resolve(true);
    } else {
      // macOS和Linux系统使用chmod +x命令设置执行权限
      exec(`chmod +x "${scriptPath}"`, (error) => {
        resolve(error ? false : true);
      });
    }
  });
}

module.exports = {
  checkAdminPermissions,
  getSudoSetupScriptPath,
  getNetconfigScriptPath,
  checkSudoSetupScriptExists,
  checkNetconfigScriptExists,
  ensureExecutablePermission
};