///|
/// 测试函数：演示所有消息类型
/// 这个文件用于测试前后端消息交互

///|
/// 测试1：简单的移动和旋转演示
pub fn test_simple_move() -> Unit {
  // 假设前端已经有一些模型
  // 移动ID为1的单位到(2, 2)
  move_to(1, (2, 2))
  
  // 改变方向
  change_direction(1, PositiveX)
}

///|
/// 测试2：显示状态圈圈
pub fn test_display_states() -> Unit {
  // 显示可移动状态（绿圈）
  display_can_move(1, true)
  
  // 显示可攻击状态（红圈）  
  display_can_attack(1, true)
}

///|
/// 测试3：清除状态
pub fn test_clear_states() -> Unit {
  clear_state(1)
}

///|
/// 测试4：移除单位
pub fn test_remove() -> Unit {
  remove_unit(2)
}

///|
/// 测试5：视角控制
pub fn test_camera_control() -> Unit {
  // 聚焦到ID为1的单位
  animate_move(1)
}

///|
/// 测试6：视角复位
pub fn test_camera_reset() -> Unit {
  animate_reset()
}

///|
/// 测试7：地图块操作
pub fn test_blocks() -> Unit {
  // 放置地图块
  put_map_block((5, 5))
  put_map_block((6, 5))
  put_map_block((7, 5))
  
  // 设置可移动块（绿色）
  set_move_block((5, 5))
  
  // 设置可攻击块（红色）
  set_attack_block((7, 5))
  
  // 清除地图块状态
  clear_block((6, 5))
}

///|
/// 测试8：完整序列演示
pub fn test_sequence() -> Unit {
  // 假设场景中已有ID=1和ID=2的单位
  
  // 1. 显示单位1可移动
  display_can_move(1, true)
  
  // 2. 移动单位1
  move_to(1, (3, 3))
  
  // 3. 清除状态
  clear_state(1)
  
  // 4. 显示可攻击
  display_can_attack(1, true)
  
  // 5. 改变朝向
  change_direction(1, PositiveX)
  
  // 6. 聚焦
  animate_move(1)
  
  // 7. 移除单位2
  remove_unit(2)
  
  // 8. 复位视角
  animate_reset()
}
